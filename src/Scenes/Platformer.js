class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    init() {
        // variables and settings
        this.ACCELERATION = 400;
        this.DRAG = 500;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 1500;
        this.JUMP_VELOCITY = -600;
        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 2.0;
        this.drowning = false;
        this.playerScore = 0;
    }

    create() {
        // Create a new tilemap game object which uses 18x18 pixel tiles, and is
        // 45 tiles wide and 25 tiles tall.
        this.map = this.add.tilemap("platformer-level-1", 18, 18, 45, 25);

        // Add a tileset to the map
        // First parameter: name we gave the tileset in Tiled
        // Second parameter: key for the tilesheet (from this.load.image in Load.js)
        this.tileset = this.map.addTilesetImage("kenny_tilemap_packed", "tilemap_tiles");

        // Create a layer
        this.groundLayer = this.map.createLayer("Ground-n-Platforms", this.tileset, 0, 0);

        // Make it collidable
        this.groundLayer.setCollisionByProperty({
            collides: true
        });

        // Find coins in the "Objects" layer in Phaser
        // Look for them by finding objects with the name "coin"
        // Assign the coin texture from the tilemap_sheet sprite sheet
        // Phaser docs:
        // https://newdocs.phaser.io/docs/3.80.0/focus/Phaser.Tilemaps.Tilemap-createFromObjects

        this.powerUp = this.map.createFromObjects("Objects", {
            name: "powerUp",
            key: "tilemap_sheet",
            frame: 128
        })

        this.coins = this.map.createFromObjects("Objects", {
            name: "coin",
            key: "tilemap_sheet",
            frame: 151
        });

        this.water = this.map.createFromObjects("Objects", {
            name: "waterLevel"
        });

        this.coinVfxEffect = this.add.particles(0, 0, "tilemap_sheet", {
            frame: 151,
            emitting: false,
            lifespan: 1500,
            scale: { start: 1.0, end: 0.0 },
            speed: { min: 100, max: 200 },
            gravityY: 800,
            rotate: { start: 0, end: 360 },
            alpha: { start: 1, end: 0 },
            quantity: 3,
        });

        my.vfx.sinking = this.add.particles(0, 0, "kenny-particles", {
            frame: ["circle_01.png"],
            scale: 0.05,
            lifespan: 2000,
            speed: {min: 10, max: 20},
            gravityY: -200,
            alpha: {start: 1, end: 0.1}, 
            quantity: 30
        });

        my.vfx.sinking.stop();

        // Since createFromObjects returns an array of regular Sprites, we need to convert 
        // them into Arcade Physics sprites (STATIC_BODY, so they don't move) 
        this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);
        this.physics.world.enable(this.powerUp, Phaser.Physics.Arcade.STATIC_BODY);
        this.physics.world.enable(this.water, Phaser.Physics.Arcade.STATIC_BODY);

        this.coins.map((coin) => {
            coin.anims.play("coin");
        });

        this.water.map((water) => {
            water.setVisible(false);
        });


        // Create a Phaser group out of the array this.coins
        // This will be used for collision detection below.
        this.coinGroup = this.add.group(this.coins);
        this.powerUpGroup = this.add.group(this.powerUp);
        this.waterGroup = this.add.group(this.water);
        

        // set up player avatar
        this.playerSpawn = this.map.findObject(
            "Objects",
            (obj) => obj.name === "playerSpawn"
        );

        my.sprite.player = this.physics.add.sprite(this.playerSpawn.x, this.playerSpawn.y, "platformer_characters", "tile_0000.png");
        my.sprite.player.setCollideWorldBounds(true);

        // Enable collision handling
        this.physics.add.collider(my.sprite.player, this.groundLayer);

        this.physics.add.overlap(my.sprite.player, this.coinGroup, (obj1, obj2) => {
            this.coinVfxEffect.explode(3, obj2.x, obj2.y);
            this.playerScore += 25;
            this.updateScore();
            obj2.destroy(); // remove coin on overlap
        });

        this.physics.add.overlap(my.sprite.player, this.powerUpGroup, (obj1, obj2) => {
            this.JUMP_VELOCITY = -2000;
            this.time.delayedCall(10000, () => {
                this.JUMP_VELOCITY = -600;
            });
            obj2.destroy();
        });

        this.physics.add.overlap(my.sprite.player, this.waterGroup, (obj1, obj2) => {
            if (!this.drowning) {
                this.drowning = true;
                this.JUMP_VELOCITY = 0;
                this.ACCELERATION = 0;
                my.sprite.player.body.setVelocityY(0);
                my.vfx.sinking.explode(30, obj1.x, obj1.y);
                this.physics.world.gravity.y = 50;
                this.time.delayedCall(2000, () => {
                    my.sprite.player.x = this.playerSpawn.x,
                    my.sprite.player.y = this.playerSpawn.y
                    my.sprite.player.body.setVelocityY(0);
                    this.physics.world.gravity.y = 1500;
                    this.JUMP_VELOCITY = -600;
                    this.ACCELERATION = 400;
                    this.drowning = false;
                });
            }
        });

        // set up Phaser-provided cursor key input
        cursors = this.input.keyboard.createCursorKeys();

        this.rKey = this.input.keyboard.addKey('R');

        // debug key listener (assigned to D key)
        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true
            this.physics.world.debugGraphic.clear()
        }, this);

        my.vfx.walking = this.add.particles(0, 0, "kenny-particles", {
            frame: ['smoke_03.png', 'smoke_09.png'],
            random: true,
            scale: {start: 0.03, end: 0.1},
            maxAliveParticles: 8,
            lifespan: 350,
            gravityY: -400,
            alpha: {start: 1, end: 0.1}, 
        });

        my.vfx.walking.stop();

       

        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25); // (target, [,roundPixels][,lerpX][,lerpY])
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.SCALE);

        my.text.score = this.add.text(360, 225, "Score " + this.playerScore).setScrollFactor(0).setOrigin(0).setDepth(1);
    }

    updateScore () { 
        my.text.score.setText("Score " + this.playerScore);
    }

    update() {
        if(cursors.left.isDown) {
            my.sprite.player.setAccelerationX(-this.ACCELERATION);
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);

            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);

            // Only play smoke effect if touching the ground

            if (my.sprite.player.body.blocked.down) {

                my.vfx.walking.start();
            }


        } else if(cursors.right.isDown) {
            my.sprite.player.setAccelerationX(this.ACCELERATION);
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);

            my.vfx.walking.setParticleSpeed(-this.PARTICLE_VELOCITY, 0);

            // Only play smoke effect if touching the ground

            if (my.sprite.player.body.blocked.down) {

                my.vfx.walking.start();
            }

        } else {
            // Set acceleration to 0 and have DRAG take over
            my.sprite.player.setAccelerationX(0);
            my.sprite.player.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');
            my.vfx.walking.stop();
        }

        // player jump
        // note that we need body.blocked rather than body.touching b/c the former applies to tilemap tiles and the latter to the "ground"
        if(!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
        }
        if(my.sprite.player.body.blocked.down && Phaser.Input.Keyboard.JustDown(cursors.up)) {
            my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
        }

        if(Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.scene.restart();
        }
    }
}