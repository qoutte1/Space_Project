// COLORS
var Colors = {
    red:0xf25346,
	white:0xd8d0d1,
	pink:0xF5986E,
	brownDark:0x23190f,
	blue:0x68c3c0,
    brown:0x8D6E63,

    silver: 0x747577,
	domeBlue: 0x449990,
    mountGrey: 0x333231,
	cockpitGrey: 0x414449,
	enemyRed: 0x404142,

    SandyBrown:0xF4A460,
    orange:0xFF6D00,
    black: 0x212121,
};

var keyboard = {};


function appendText(txt)
{   document.getElementById('message').innerHTML += txt;   }
function clearText()
{   document.getElementById('message').innerHTML = '..........';   }

 
//BULLETS ARRAY
var ammo = [];
var bulletInUse = [];
var canShoot = 0;
var controls, time = Date.now();

//GAME VARIABLES
var game;
var deltaTime = 0;
var newTime = new Date().getTime();
var oldTime = new Date().getTime();
var enemiesInUse = [];
var enemiesPool = [];
var particlesPool = [];
var particlesInUse = [];

function resetGame(){
  game = {speed:0,
          initSpeed:.00035,
          baseSpeed:.00035,
          targetBaseSpeed:.00035,
          incrementSpeedByTime:.0000025,
          incrementSpeedByLevel:.000005,
          distanceForSpeedUpdate:100,
          speedLastUpdate:0,

          distance:0,
          ratioSpeedDistance:50,
          energy:100,
          ratioSpeedEnergy:3,

          level:5,
          levelLastUpdate:0,
          distanceForLevelUpdate:1000,

          shipDefaultHeight:100,
          shipAmpHeight:80,
          shipAmpWidth:75,
          shipMoveSensivity:0.005,
          shipRotXSensivity:0.0008,
          shipRotZSensivity:0.0004,
          shipFallSpeed:.001,
          shipMinSpeed:1.2,
          shipMaxSpeed:1.6,
          shipSpeed:0,
          shipCollisionDisplacementX:0,
          shipCollisionSpeedX:0,

          shipCollisionDisplacementY:0,
          shipCollisionSpeedY:0,

          seaRadius:600,
          seaLength:800,
          //seaRotationSpeed:0.006,
          wavesMinAmp : 5,
          wavesMaxAmp : 20,
          wavesMinSpeed : 0.001,
          wavesMaxSpeed : 0.003,

          cameraFarPos:500,
          cameraNearPos:150,
          cameraSensivity:0.002,

          coinDistanceTolerance:15,
          coinValue:3,
          coinsSpeed:.5,
          coinLastSpawn:0,
          distanceForCoinsSpawn:100,

          enemyDistanceTolerance:10,
          enemyValue:10,
          enemiesSpeed:.6,
          enemyLastSpawn:0,
          distanceForEnemiesSpawn:50,

          status : "playing",
         };
 // fieldLevel.innerHTML = Math.floor(game.level);
}

//-----------------------------------------------------


// THREEJS RELATED VARIABLES
var scene,
            camera, fieldOfView, aspectRatio, nearPlane, farPlane, HEIGHT, WIDTH,
            renderer, container, controls, raycaster;

var score = 0;
var countT = 0;

//INTERSECTION VARIABLES
var rayIntersects;


var shipBB, enemyBB;

// THE SCENE, THE CAMERA, AND THE RENDERER ARE CREATED IN THE createScene FUNTION:
function createScene(){
    // Get the width and the height of the screen,
    // use them to set up the aspect ratio of the camera
    // and the size of the renderer.
    HEIGHT = window.innerHeight;
    WIDTH = window.innerWidth;

    // Create the scene
    scene = new THREE.Scene();

    // Create the camera
    aspectRatio = WIDTH / HEIGHT;
    fieldOfView = 60;
    nearPlane = 1;
    farPlane = 10000;
    camera = new THREE.PerspectiveCamera(
        fieldOfView,
        aspectRatio,
        nearPlane,
        farPlane
    );

    // Add a fog effect to the scene; same color as the
    // background color used in the style sheet
    scene.fog = new THREE.Fog(0xf7d9aa, 100, 950);


    // Set the position of the camera
    camera.position.x = 0;
    camera.position.z = 200;
    camera.position.y = 100;

    // Create the renderer
    renderer = new THREE.WebGLRenderer({
        // Allow transparency to show the gradient background
        // we defined in the CSS
        alpha: true,

        // Activate the anti-aliasing: this is less performant,
        // but, as our project is low-poly based, it should be fine
        antialias: true

    });

    // Define the size of the renderer: in this case, 
    // it will fill the entire screen
    renderer.setSize(WIDTH, HEIGHT);
    

    // Enable shadow rendering
    renderer.shadowMap.enabled = true;

    // Add the DOM element of the renderer to the
    // container we created in the HTML
    container = document.getElementById('world');
    container.appendChild(renderer.domElement);


    // Listen to the screen: if the user resizes it 
    // we have to update the camera and the renderer size
    window.addEventListener('resize', handleWindowResize, false);



}


function handleWindowResize(){
    // Update height and width of the renderer and the camera
    HEIGHT = window.innerHeight;
    WIDTH = window.innerWidth;
    renderer.setSize(WIDTH, HEIGHT);
    camera.aspect = WIDTH / HEIGHT;
    camera.updateProjectionMatrix();

}


// LIGHTS

var hemisphereLight, shadowLight, ambientLight;

function createLights(){
    // A hemisphere light is a gradient colored light:
    // the first parameter is the sky color, the second parameter is the ground color,
    // the third parameter is the intensity of the light
    hemisphereLight = new THREE.HemisphereLight(0xaaaaaa, 0x000000, .9);
    //ambient light modifies the global color of a scene and makes the shadows softer
    ambientLight = new THREE.AmbientLight(0xdc8874, .5);

    // A directional light shines from a specific direction.
    // It acts like the sun, that means that all the rays produced are parallel.
    shadowLight = new THREE.DirectionalLight(0xffffff, .9);

    // Set the direction of the light
    shadowLight.position.set(150, 350, 350);

    // Allow shadow casting
    shadowLight.castShadow = true;

    // define the visible area of the projected shadow
    shadowLight.shadow.camera.left = -400;
    shadowLight.shadow.camera.right = 400;
    shadowLight.shadow.camera.top = 400;
    shadowLight.shadow.camera.bottom = -400;
    shadowLight.shadow.camera.near = 1;
    shadowLight.shadow.camera.far = 1000;


    // define the resolution of the shadow: the higher the better,
    // but also the more expensive and less performant
    shadowLight.shadow.mapSize.width = 2048;
    shadowLight.shadow.mapSize.height = 2048;


    // to activate the lights, just add them to the scene
    scene.add(hemisphereLight);
    scene.add(ambientLight);
    scene.add(shadowLight);
    
}

// First let's define a Sea object :
Sea = function(){

    // create the geometry (shape) of the cylinder.
    // the parameters are:
    // radius top, radius bottom, height, number of segments on the radius, number of segments vertically
    var geom = new THREE.CylinderGeometry(game.seaRadius, game.seaRadius, game.seaLength, 40, 10);
    // rotate the geometry on the x axis
    geom.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));
    //**important: by merging vertices we ensure the continuity of the waves */
    geom.mergeVertices();

    // get vertices
    var l = geom.vertices.length;

    //create an array to store new data associated to each vertex
    this.waves = [];

    for(var i = 0; i < l; i++){
        //get each vertex
        var v = geom.vertices[i];

        // store some data associated to it
        this.waves.push({y:v.y,
                         x:v.x,
                         z:v.z,
                         //a random angle
                         ang:Math.random()*Math.PI*2,
                         // a random distance
                         amp:5 + Math.random()*15,
                         // a random speed between 0.016 and 0..048 radians /frame
                         speed:0.016 + Math.random()*0.032
                        });
    }

    // create the material
    var mat = new THREE.MeshPhongMaterial({
        color:Colors.SandyBrown,
        transparent:false,
        opacity:1,
        shading:THREE.FlatShading,
    });

    // To create an object in Three.js, we have to create a mesh
    // which is a combination of a geometry and some material
    this.mesh = new THREE.Mesh(geom, mat);

    // Allow the sea to receive shadows
    this.mesh.receiveShadow = true;

}

// now we create the function that will be called in each frame
// to update the position of the vertices to simulate waves
Sea.prototype.moveWaves = function (){

//get the vertices
  var verts = this.mesh.geometry.vertices;
  var l = verts.length;

  for (var i=0; i<l; i++){
    var v = verts[i];
    // get the data associated to it
    var vprops = this.waves[i];

    //update the position of the vertex
    v.x =  vprops.x + Math.cos(vprops.ang)*vprops.amp;
    v.y = vprops.y + Math.sin(vprops.ang)*vprops.amp;

    // increment the angle for the next frame
    vprops.ang += vprops.speed;
  }

  // Tell the renderer that the geometry of the sea has changed.
  // In fact, in order to maintain the best level of performance,
  // three.js caches the geometries and ignores any changes
  // unless we add this line
 // this.mesh.geometry.verticesNeedUpdate=true;

  sea.mesh.rotation.z += .005;
}


// Instantiate the sea and add it to the scene:
var sea;

function createSea(){
    sea = new Sea();

    // push it a little bit at the bottom of the scene
    sea.mesh.position.y = -game.seaRadius;

    // add the mesh of the sea to the scene
    scene.add(sea.mesh);

}
//^^^TO SUMMARIZE OBJECT CREATION:^^^
// 1. create a geometry
// 2. create a material
// 3. pass them into a mesh
// 4. add the mesh to our scene

Cloud = function(){
    // Create an empty container that will hold the different parts of the cloud
	this.mesh = new THREE.Object3D();
	
	// create a cube geometry;
	// this shape will be duplicated to create the cloud
	var geom = new THREE.BoxGeometry(20,20,20);
	
	// create a material; a simple white material will do the trick
	var mat = new THREE.MeshPhongMaterial({
		color:Colors.white,  
	});
	
	// duplicate the geometry a random number of times
	var nBlocs = 3+Math.floor(Math.random()*3);
	for (var i=0; i<nBlocs; i++ ){
		
		// create the mesh by cloning the geometry
		var m = new THREE.Mesh(geom, mat); 
		
		// set the position and the rotation of each cube randomly
		m.position.x = i*15;
		m.position.y = Math.random()*10;
		m.position.z = Math.random()*10;
		m.rotation.z = Math.random()*Math.PI*2;
		m.rotation.y = Math.random()*Math.PI*2;
		
		// set the size of the cube randomly
		var s = .1 + Math.random()*.9;
		m.scale.set(s,s,s);
		
		// allow each cube to cast and to receive shadows
		m.castShadow = true;
		m.receiveShadow = true;
		
		// add the cube to the container we first created
		this.mesh.add(m);
	
    }
}
//NOW THAT WE HAVE A CLOUD WE CAN USE IT TO CREATE AN ENTIRE SKY BY DUPLICATING IT
// AND PLACING IT AT RANDOM POSITIONS AROUND Z-AXIS;

// Define a Sky Object
Sky = function(){
    // Create an empty container
    this.mesh = new THREE.Object3D();

    // choose a number of clouds to be scattered in the sky
    this.nClouds = 20;

    // To distribute the clouds consistently,
    // we need to place them according to a uniform angle
    var stepAngle = Math.PI*2 / this.nClouds;

    // create the clouds
    for(var i = 0; i < this.nClouds; i++){
        var c = new Cloud();

        // set the rotation and the position of each cloud;
        // for that we use a bit of trigonometry
        var a = stepAngle*i; // this is the final angle of the cloud
        var h = 750 + Math.random()*200; // this is the distance between the center of the axis and the cloud itself

        // Trigonometry! 
        // we are simply converting polar coordinates (angle, distance) int Cartesion Coords (x, y)
        c.mesh.position.y = Math.sin(a)*h;
        c.mesh.position.x = Math.cos(a)*h;


        // rotate the cloud according to its position
        c.mesh.rotation.z = a + Math.PI/2;

        // for a better result, we position the clouds
        // at random depths inside of the scene
        c.mesh.position.z = -400-Math.random()*400;


        // we also set a random scale for each cloud
        var s = 1 + Math.random()*2;
        c.mesh.scale.set(s,s,s);

        // do not forget to add the mesh of each cloud in the scene
        this.mesh.add(c.mesh);

    }
}

// Now we instantiate the sky and push its center a bit
// towards the bottom of screen
var sky;

function createSky(){
    sky = new Sky();
    sky.mesh.position.y = -game.seaRadius;
    scene.add(sky.mesh);

}


var Burner = function(){
  this.mesh = new THREE.Object3D();
  this.mesh.name = "burner";
  this.angleHairs=0;


  var hairGeom = new THREE.BoxGeometry(10,10,5);
  var hairMat = new THREE.MeshLambertMaterial({color:Colors.blue});
  var hair = new THREE.Mesh(hairGeom, hairMat);
  hair.geometry.applyMatrix(new THREE.Matrix4().makeTranslation(-60,-20,15));
  var hairs = new THREE.Object3D();

  this.hairsTop = new THREE.Object3D();

  for (var i=0; i<12; i++){
    var h = hair.clone();
    var col = i%3;
    var row = Math.floor(i/3);
    var startPosZ = -4;
    var startPosX = -4;
    h.position.set(startPosX + row*4, 0, startPosZ + col*4);
    this.hairsTop.add(h);
  }
  hairs.add(this.hairsTop);



  this.mesh.add(hairs);

}

Burner.prototype.updateHairs = function(){
  var hairs = this.hairsTop.children;

  var l = hairs.length;
  for (var i=0; i<l; i++){
    var h = hairs[i];
    h.scale.y = .75 + Math.cos(this.angleHairs+i/3)*.25;
  }
  this.angleHairs += 0.16;
}

//**bullets */

var Bullet = function(){
  this.mesh = new THREE.Object3D();
  this.mesh.name = "bullet";

  var bulletGeom = new THREE.CylinderGeometry(3, 3, 10, 6, 1, false);
  var bulletMat = new THREE.MeshLambertMaterial({color:Colors.blue});
  var bullet = new THREE.Mesh(bulletGeom, bulletMat);
  bullet.rotation.z = 0.5 * Math.PI;
 // bullet.geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0,,15));
  var bullets = new THREE.Object3D();
 
  bullets.add(bullet);



  this.mesh.add(bullets);

}

var bullet;

function createBullet(){
    for(var index = 0; index < ammo.length; index +=1){
        if(ammo[index] == undefined) continue;
        if(ammo[index].alive == false){
            ammo.splice(index, 1);
            continue;
        }

        ammo[index].position.add(ammo[index].velocity);
    }

    bullet = new Bullet();
    bullet.mesh.scale.set(.25, .15, .25);

    bullet.mesh.velocity = new THREE.Vector3(15, 0, 0);
    bullet.mesh.position.y = spaceship.mesh.position.y;
    bullet.mesh.position.x = 17;

    
    bullet.alive = true;
    setTimeout(function() {
        bullet.alive = false;
        for(i = 0; i < ammo.length; ++i){
        scene.remove(ammo[i]);
    }
    }, 1500);
    
    ammo.push(bullet.mesh);
    bulletInUse.push(bullet.mesh);

    scene.add(bullet.mesh);
    canShoot = 10;
}



//******************************************************** */
//**CODE FOR SHIP HERE */
var SpaceShip = function(){
    this.mesh = new THREE.Object3D();

    // Create the body
    //(radius top, radius bottom, height, redius segments, height seg, open end, theta start)
    var geomBody = new THREE.CylinderGeometry(20, 10, 120, 6, 1, false);
    var matBody = new THREE.MeshPhongMaterial({color:Colors.white, shading:THREE.FlatShading});

    var body = new THREE.Mesh(geomBody, matBody);
    body.rotation.z = 0.5 * Math.PI;
    body.castShadow = true;
    body.receiveShadow = true;
    this.mesh.add(body);

    // Create the cabin
    //(radius, detail)
    var geomCabin = new THREE.CylinderGeometry(12, 10, 25, 6, 1, false);
    var matCabin = new THREE.MeshPhongMaterial({color:Colors.black, shading:THREE.FlatShading});

    var cabin = new THREE.Mesh(geomCabin, matCabin);
    cabin.rotation.z = 0.5 * Math.PI;
    cabin.position.set(0, 8, 0);
    cabin.castShadow = false;
    cabin.receiveShadow = true;
    this.mesh.add(cabin);

    //ENGINE 1 (TOP-FORWARD)
    var geomEngine = new THREE.CylinderGeometry(5, 5, 40, 8, 1, false);
    var matEngine = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.FlatShading});

    var engine = new THREE.Mesh(geomEngine, matEngine);
    engine.rotation.z = 0.5 * Math.PI;
    engine.position.set(-45, 15, 15);
    engine.castShadow = true;
    engine.receiveShadow = true;
    this.mesh.add(engine);

    //ENGINE 2 (BOTTOM-FORMWARD)
    var geomEngine2 = new THREE.CylinderGeometry(5, 5, 40, 8, 1, false);
    var matEngine2 = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.FlatShading});

    var engine2 = new THREE.Mesh(geomEngine2, matEngine2);
    engine2.rotation.z = 0.5 * Math.PI;
    engine2.position.set(-45, -15, 15);
    engine2.castShadow = true;
    engine2.receiveShadow = true;
    this.mesh.add(engine2);

    //ENGINE 3 (TOP-BACK)
    var geomEngine3 = new THREE.CylinderGeometry(5, 5, 40, 8, 1, false);
    var matEngine3 = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.FlatShading});

    var engine3 = new THREE.Mesh(geomEngine3, matEngine3);
    engine3.rotation.z = 0.5 * Math.PI;
    engine3.position.set(-45, 15, -15);
    engine3.castShadow = true;
    engine3.receiveShadow = true;
    this.mesh.add(engine3);

    //ENGINE 4 (BOTTOM-BACK)
    var geomEngine4 = new THREE.CylinderGeometry(5, 5, 40, 8, 1, false);
    var matEngine4 = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.FlatShading});

    var engine4 = new THREE.Mesh(geomEngine4, matEngine4);
    engine4.rotation.z = 0.5 * Math.PI;
    engine4.position.set(-45, -15, -15);
    engine4.castShadow = true;
    engine4.receiveShadow = true;
    this.mesh.add(engine4);

    //exhaust 1 (top-forward)
    // (radius, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength)
    var geomExhaust = new THREE.ConeGeometry(3, 40, 20, 10, false);
    var matExhaust = new THREE.MeshPhongMaterial({
        color:Colors.orange,
        transparent:true,
        opacity:.3,
        shading:THREE.FlatShading
    });

    var exhaust = new THREE.Mesh(geomExhaust, matExhaust);
    exhaust.rotation.z = 0.5 * Math.PI;
    exhaust.position.set(-85, 15, 15);
    exhaust.castShadow = true;
    exhaust.receiveShadow = true;
    this.mesh.add(exhaust);

    //exhaust 2 (bottom-forward)
    // (radius, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength)
    var geomExhaust2 = new THREE.ConeGeometry(3, 40, 20, 10, false);
    var matExhaust2 = new THREE.MeshPhongMaterial({
        color:Colors.orange,
        transparent:true,
        opacity:.3,
        shading:THREE.FlatShading
    });

    var exhaust2 = new THREE.Mesh(geomExhaust2, matExhaust2);
    exhaust2.rotation.z = 0.5 * Math.PI;
    exhaust2.position.set(-85, -15, 15);
    exhaust2.castShadow = true;
    exhaust2.receiveShadow = true;
    this.mesh.add(exhaust2);

    //exhaust 3 (top-back)
    // (radius, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength)
    var geomExhaust3 = new THREE.ConeGeometry(3, 40, 20, 10, false);
    var matExhaust3 = new THREE.MeshPhongMaterial({
        color:Colors.orange,
        transparent:true,
        opacity:.3,
        shading:THREE.FlatShading
    });

    var exhaust3 = new THREE.Mesh(geomExhaust3, matExhaust3);
    exhaust3.rotation.z = 0.5 * Math.PI;
    exhaust3.position.set(-85, 15, -15);
    exhaust3.castShadow = true;
    exhaust3.receiveShadow = true;
    this.mesh.add(exhaust3);

    //exhaust 4 (bottom-back)
    // (radius, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength)
    var geomExhaust4 = new THREE.ConeGeometry(3, 40, 20, 10, false);
    var matExhaust4 = new THREE.MeshPhongMaterial({
        color:Colors.orange,
        transparent:true,
        opacity:.3,
        shading:THREE.FlatShading
    });

    var exhaust4 = new THREE.Mesh(geomExhaust4, matExhaust4);
    exhaust4.rotation.z = 0.5 * Math.PI;
    exhaust4.position.set(-85, -15, -15);
    exhaust4.castShadow = true;
    exhaust4.receiveShadow = true;
    this.mesh.add(exhaust4);


    // Create the wing
    var geomSideWing = new THREE.BoxGeometry(30, 2, 180, 1, 1, 1);
    var matSideWing = new THREE.MeshPhongMaterial({color:Colors.white, shading:THREE.FlatShading});
    // we can access a specific vertex of a shape through 
// the vertices array, and then move its x, y and z property:
// geomSideWing.vertices[1].z+=30;
// geomSideWing.vertices[0].z-=30;
// geomSideWing.vertices[3].z+=30;
// geomSideWing.vertices[2].z-=30;
	var sideWing = new THREE.Mesh(geomSideWing, matSideWing);
   sideWing.rotation.x = 0.95 * Math.PI;
    sideWing.position.set(-25, 0, 0);
    sideWing.castShadow = true;
    sideWing.receiveShadow = true;
    this.mesh.add(sideWing);


    // Create the wing2
    var geomSideWing2 = new THREE.BoxGeometry(30, 2, 180, 1, 1, 1);
    var matSideWing2 = new THREE.MeshPhongMaterial({color:Colors.white, shading:THREE.FlatShading});
    // we can access a specific vertex of a shape through 
// the vertices array, and then move its x, y and z property:
// geomSideWing2.vertices[1].z+=30;
// geomSideWing2.vertices[0].z-=30;
// geomSideWing2.vertices[3].z+=30;
// geomSideWing2.vertices[2].z-=30;
	var sideWing2 = new THREE.Mesh(geomSideWing2, matSideWing2);
    sideWing2.rotation.x = -0.95 * Math.PI;
    sideWing2.position.set(-25, 0, 0);
    sideWing2.castShadow = true;
    sideWing2.receiveShadow = true;
    this.mesh.add(sideWing2);

}

//NOW WE INSTANTIATE THE SPACESHIP AND ADD IT TO OUR SCENE
var spaceship;

function createShip(){
    spaceship = new SpaceShip();
    spaceship.mesh.scale.set(.25, .25, .25);
    spaceship.mesh.position.y = game.shipDefaultHeight;
    scene.add(spaceship.mesh);
}

//****************************************************88 */
//Bounded box
// var Boxed = function(){
//     this.mesh = new THREE.Object3D();

//     // Create the body
//     //(radius top, radius bottom, height, redius segments, height seg, open end, theta start)
//     var geomBoxed = new THREE.BoxGeometry(40,20,40,1,1,1);
//     var matBoxed = new THREE.MeshPhongMaterial({color:Colors.blue, shading:THREE.FlatShading, wireframe: true});

//     var boxed = new THREE.Mesh(geomBoxed, matBoxed);
//     boxed.castShadow = true;
//     boxed.receiveShadow = true;
//     this.mesh.add(boxed);
// }

//     var bodyBoxed;
//     function createBodyBoxed(){
//         bodyBoxed = new Boxed();
//         bodyBoxed.mesh.position.y = spaceship.mesh.position.y;
//         bodyBoxed.mesh.position.x = -5;
//         scene.add(bodyBoxed.mesh);
//     }
//************************************************************************************ */

 Enemy = function(){
    // Create an empty container 
    this.mesh = new THREE.Object3D();
    this.mesh.name = "enemy";

    // Create the enemy geometry
    var geomEnemy = new THREE.TetrahedronGeometry(8,2);
   //var geomEnemy = new THREE.BoxGeometry(20, 20, 20);
    // Create the material
    var matEnemy = new THREE.MeshPhongMaterial({color:Colors.brown, shading:THREE.FlatShading});
    var enemy = new THREE.Mesh(geomEnemy, matEnemy);
  // this.mesh = new THREE.Mesh(geomEnemy, matEnemy);


    enemy.position.x = 2 * 15;
    enemy.position.y = Math.random() * 10;
    enemy.rotation.z = Math.random()*Math.PI*2;
    enemy.rotation.y = Math.random()*Math.PI*2;


    //cast and receive shadows
    enemy.castShadow = true;
    // this.mesh.castShadow = true;
   enemy.receiveShadow = true;
//    this.mesh.receiveShadow = true;



    this.mesh.add(enemy); 
}



Enemies  = function(){
    this.mesh = new THREE.Object3D;

    var stepAngle = Math.PI*2 / 10;

    var e = new Enemy();

    var a = stepAngle * 1;
    var h = 600 + Math.random() * 200;
    
    e.mesh.position.y = Math.sin(a) * h;
    e.mesh.position.x = Math.cos(a) * h;

    //rotate the enemy according to position 
    e.mesh.rotation.z = a + Math.PI/2;

    //we also can set a random scale for each enemy
    var s = 1 + Math.random()*2;
    e.mesh.scale.set(s,s,s);

    //and now we add the mesh of each enemy to the scene
    this.mesh.add(e.mesh);

}

// Now instantiate the enemeies
var enemies;
function createEnemies(){
    // for(var i = 0; i < 10; i++){
    //     var enemies = new Enemy();
    //     enemiesPool.push(enemies);
    //     enemiesHolder = new EnemiesHolder();
    //     scene.add(enemiesHolder.mesh);
    // }

    enemies = new Enemies();
    // enemies.mesh.position.y =  100 + Math.random()*80;
    // enemies.mesh.position.x = 20;
    enemies.mesh.position.y = -600;

    
    scene.add(enemies.mesh);
}

/********************************************************* */
Enemies1  = function(){
    this.mesh = new THREE.Object3D;

    var stepAngle = Math.PI*2 / 10;

    var e = new Enemy();

    var a = stepAngle * 2;
    var h = 600 + Math.random() * 200;
    
    e.mesh.position.y = Math.sin(a) * h;
    e.mesh.position.x = Math.cos(a) * h;

    //rotate the enemy according to position 
    e.mesh.rotation.z = a + Math.PI/2;

    //we also can set a random scale for each enemy
    var s = 1 + Math.random()*2;
    e.mesh.scale.set(s,s,s);

    //and now we add the mesh of each enemy to the scene
    this.mesh.add(e.mesh);

}

// Now instantiate the enemeies
var enemies1;
function createEnemies1(){
    // for(var i = 0; i < 10; i++){
    //     var enemies = new Enemy();
    //     enemiesPool.push(enemies);
    //     enemiesHolder = new EnemiesHolder();
    //     scene.add(enemiesHolder.mesh);
    // }

    enemies1 = new Enemies1();
    // enemies.mesh.position.y =  100 + Math.random()*80;
    // enemies.mesh.position.x = 20;
    enemies1.mesh.position.y = -600;

    
    scene.add(enemies1.mesh);
}

//--------------------------------------------------------------------------------------
//--------------------------------------------------------------------------------------
Enemies2  = function(){
    this.mesh = new THREE.Object3D;

    var stepAngle = Math.PI*2 / 10;

    var e = new Enemy();

    var a = stepAngle *3;
    var h = 600 + Math.random() * 200;
    
    e.mesh.position.y = Math.sin(a) * h;
    e.mesh.position.x = Math.cos(a) * h;

    //rotate the enemy according to position 
    e.mesh.rotation.z = a + Math.PI/2;

    //we also can set a random scale for each enemy
    var s = 1 + Math.random()*2;
    e.mesh.scale.set(s,s,s);

    //and now we add the mesh of each enemy to the scene
    this.mesh.add(e.mesh);

}

// Now instantiate the enemeies
var enemies2;
function createEnemies2(){
    // for(var i = 0; i < 10; i++){
    //     var enemies = new Enemy();
    //     enemiesPool.push(enemies);
    //     enemiesHolder = new EnemiesHolder();
    //     scene.add(enemiesHolder.mesh);
    // }

    enemies2 = new Enemies2();
    // enemies.mesh.position.y =  100 + Math.random()*80;
    // enemies.mesh.position.x = 20;
    enemies2.mesh.position.y = -600;

    
    scene.add(enemies2.mesh);
}
//--------------------------------------------------------------------------------
//---------------------------------------------------------------------------------
Enemies3  = function(){
    this.mesh = new THREE.Object3D;

    var stepAngle = Math.PI*2 / 10;

    var e = new Enemy();

    var a = stepAngle * 4;
    var h = 600 + Math.random() * 200;
    
    e.mesh.position.y = Math.sin(a) * h;
    e.mesh.position.x = Math.cos(a) * h;

    //rotate the enemy according to position 
    e.mesh.rotation.z = a + Math.PI/2;

    //we also can set a random scale for each enemy
    var s = 1 + Math.random()*2;
    e.mesh.scale.set(s,s,s);

    //and now we add the mesh of each enemy to the scene
    this.mesh.add(e.mesh);

}

// Now instantiate the enemeies
var enemies3;
function createEnemies3(){
    // for(var i = 0; i < 10; i++){
    //     var enemies = new Enemy();
    //     enemiesPool.push(enemies);
    //     enemiesHolder = new EnemiesHolder();
    //     scene.add(enemiesHolder.mesh);
    // }

    enemies3 = new Enemies3();
    // enemies.mesh.position.y =  100 + Math.random()*80;
    // enemies.mesh.position.x = 20;
    enemies3.mesh.position.y = -600;

    
    scene.add(enemies3.mesh);
}
//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
Enemies4  = function(){
    this.mesh = new THREE.Object3D;

    var stepAngle = Math.PI*2 / 10;

    var e = new Enemy();

    var a = stepAngle * 5;
    var h = 600 + Math.random() * 200;
    
    e.mesh.position.y = Math.sin(a) * h;
    e.mesh.position.x = Math.cos(a) * h;

    //rotate the enemy according to position 
    e.mesh.rotation.z = a + Math.PI/2;

    //we also can set a random scale for each enemy
    var s = 1 + Math.random()*2;
    e.mesh.scale.set(s,s,s);

    //and now we add the mesh of each enemy to the scene
    this.mesh.add(e.mesh);

}

// Now instantiate the enemeies
var enemies4;
function createEnemies4(){
    // for(var i = 0; i < 10; i++){
    //     var enemies = new Enemy();
    //     enemiesPool.push(enemies);
    //     enemiesHolder = new EnemiesHolder();
    //     scene.add(enemiesHolder.mesh);
    // }

    enemies4 = new Enemies4();
    // enemies.mesh.position.y =  100 + Math.random()*80;
    // enemies.mesh.position.x = 20;
    enemies4.mesh.position.y = -600;

    
    scene.add(enemies4.mesh);
}
//-----------------------------------------------------------------------------
//----------------------------------------------------------------------------
Enemies5  = function(){
    this.mesh = new THREE.Object3D;

    var stepAngle = Math.PI*2 / 10;

    var e = new Enemy();

    var a = stepAngle * 6;
    var h = 600 + Math.random() * 200;
    
    e.mesh.position.y = Math.sin(a) * h;
    e.mesh.position.x = Math.cos(a) * h;

    //rotate the enemy according to position 
    e.mesh.rotation.z = a + Math.PI/2;

    //we also can set a random scale for each enemy
    var s = 1 + Math.random()*2;
    e.mesh.scale.set(s,s,s);

    //and now we add the mesh of each enemy to the scene
    this.mesh.add(e.mesh);

}

// Now instantiate the enemeies
var enemies5;
function createEnemies5(){
    // for(var i = 0; i < 10; i++){
    //     var enemies = new Enemy();
    //     enemiesPool.push(enemies);
    //     enemiesHolder = new EnemiesHolder();
    //     scene.add(enemiesHolder.mesh);
    // }

    enemies5 = new Enemies5();
    // enemies.mesh.position.y =  100 + Math.random()*80;
    // enemies.mesh.position.x = 20;
    enemies5.mesh.position.y = -600;

    
    scene.add(enemies5.mesh);
}
//----------------------------------------------------------------------------------
//----------------------------------------------------------------------------------
Enemies6  = function(){
    this.mesh = new THREE.Object3D;

    var stepAngle = Math.PI*2 / 10;

    var e = new Enemy();

    var a = stepAngle * 7;
    var h = 600 + Math.random() * 200;
    
    e.mesh.position.y = Math.sin(a) * h;
    e.mesh.position.x = Math.cos(a) * h;

    //rotate the enemy according to position 
    e.mesh.rotation.z = a + Math.PI/2;

    //we also can set a random scale for each enemy
    var s = 1 + Math.random()*2;
    e.mesh.scale.set(s,s,s);

    //and now we add the mesh of each enemy to the scene
    this.mesh.add(e.mesh);

}

// Now instantiate the enemeies
var enemies6;
function createEnemies6(){
    // for(var i = 0; i < 10; i++){
    //     var enemies = new Enemy();
    //     enemiesPool.push(enemies);
    //     enemiesHolder = new EnemiesHolder();
    //     scene.add(enemiesHolder.mesh);
    // }

    enemies6 = new Enemies6();
    // enemies.mesh.position.y =  100 + Math.random()*80;
    // enemies.mesh.position.x = 20;
    enemies6.mesh.position.y = -600;

    
    scene.add(enemies6.mesh);
}

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
Enemies7  = function(){
    this.mesh = new THREE.Object3D;

    var stepAngle = Math.PI*2 / 10;

    var e = new Enemy();

    var a = stepAngle * 8;
    var h = 600 + Math.random() * 200;
    
    e.mesh.position.y = Math.sin(a) * h;
    e.mesh.position.x = Math.cos(a) * h;

    //rotate the enemy according to position 
    e.mesh.rotation.z = a + Math.PI/2;

    //we also can set a random scale for each enemy
    var s = 1 + Math.random()*2;
    e.mesh.scale.set(s,s,s);

    //and now we add the mesh of each enemy to the scene
    this.mesh.add(e.mesh);

}

// Now instantiate the enemeies
var enemies7;
function createEnemies7(){
    // for(var i = 0; i < 10; i++){
    //     var enemies = new Enemy();
    //     enemiesPool.push(enemies);
    //     enemiesHolder = new EnemiesHolder();
    //     scene.add(enemiesHolder.mesh);
    // }

    enemies7 = new Enemies7();
    // enemies.mesh.position.y =  100 + Math.random()*80;
    // enemies.mesh.position.x = 20;
    enemies7.mesh.position.y = -600;

    
    scene.add(enemies7.mesh);
}
//------------------------------------------------------------------------------------
//--------------------------------------------------------------------------------------
Enemies8  = function(){
    this.mesh = new THREE.Object3D;

    var stepAngle = Math.PI*2 / 10;

    var e = new Enemy();

    var a = stepAngle * 9;
    var h = 600 + Math.random() * 200;
    
    e.mesh.position.y = Math.sin(a) * h;
    e.mesh.position.x = Math.cos(a) * h;

    //rotate the enemy according to position 
    e.mesh.rotation.z = a + Math.PI/2;

    //we also can set a random scale for each enemy
    var s = 1 + Math.random()*2;
    e.mesh.scale.set(s,s,s);

    //and now we add the mesh of each enemy to the scene
    this.mesh.add(e.mesh);

}

// Now instantiate the enemeies
var enemies8;
function createEnemies8(){
    // for(var i = 0; i < 10; i++){
    //     var enemies = new Enemy();
    //     enemiesPool.push(enemies);
    //     enemiesHolder = new EnemiesHolder();
    //     scene.add(enemiesHolder.mesh);
    // }

    enemies8 = new Enemies8();
    // enemies.mesh.position.y =  100 + Math.random()*80;
    // enemies.mesh.position.x = 20;
    enemies8.mesh.position.y = -600;

    
    scene.add(enemies8.mesh);
}
//--------------------------------------------------------------------------
//--------------------------------------------------------------------------
Enemies9  = function(){
    this.mesh = new THREE.Object3D;

    var stepAngle = Math.PI*2 / 10;

    var e = new Enemy();

    var a = stepAngle * 10;
    var h = 600 + Math.random() * 200;
    
    e.mesh.position.y = Math.sin(a) * h;
    e.mesh.position.x = Math.cos(a) * h;

    //rotate the enemy according to position 
    e.mesh.rotation.z = a + Math.PI/2;

    //we also can set a random scale for each enemy
    var s = 1 + Math.random()*2;
    e.mesh.scale.set(s,s,s);

    //and now we add the mesh of each enemy to the scene
    this.mesh.add(e.mesh);

}

// Now instantiate the enemeies
var enemies9;
function createEnemies9(){
    // for(var i = 0; i < 10; i++){
    //     var enemies = new Enemy();
    //     enemiesPool.push(enemies);
    //     enemiesHolder = new EnemiesHolder();
    //     scene.add(enemiesHolder.mesh);
    // }

    enemies9 = new Enemies9();
    // enemies.mesh.position.y =  100 + Math.random()*80;
    // enemies.mesh.position.x = 20;
    enemies9.mesh.position.y = -600;

    
    scene.add(enemies9.mesh);
}


//*************************************************************************** */
//*****OTHER ENEMIES******************************************************* */


var EnemyShip1 = function(){
    this.mesh = new THREE.Object3D();
	
	//Outer Body Ring
	var geomBody = new THREE.TorusGeometry( 5, 1.4, 3, 100 );
    var matBody = new THREE.MeshPhongMaterial({color:Colors.silver, shading:THREE.FlatShading});

    var body = new THREE.Mesh(geomBody, matBody);
	body.rotation.x = 1.5;
    body.castShadow = true;
    body.receiveShadow = true;
    body.rotation.z = 2
    this.mesh.add(body);
	
	//Cockpit
	var geomPit = new THREE.SphereGeometry( 4, 8, 6, 0,Math.PI*2,0,1.3 );
    var matPit = new THREE.MeshPhongMaterial({color:Colors.domeBlue, shading:THREE.FlatShading});

    var pit = new THREE.Mesh(geomPit, matPit);
	pit.position.x = -0.15;
    pit.castShadow = true;
    pit.receiveShadow = true;
    pit.rotation.z = 2.9;
    this.mesh.add(pit);
	
	//Bottom Cap
	var geomCap = new THREE.CylinderGeometry( 5, 5, 1, 64 );
    var matCap = new THREE.MeshPhongMaterial({color:Colors.white, shading:THREE.FlatShading});

    var cap = new THREE.Mesh(geomCap, matCap);
	//cap.position.y = -1;
    cap.castShadow = true;
    cap.receiveShadow = true;
    cap.rotation.z = 2.9;
    this.mesh.add(cap);

}

EnemiesShip1  = function(){
    this.mesh = new THREE.Object3D;

    var stepAngle = Math.PI*2 / 10;

    var e = new EnemyShip1();

    var a = stepAngle * 5;
    var h = 600 + Math.random() * 200;
    
    e.mesh.position.y = Math.sin(a) * h;
    e.mesh.position.x = Math.cos(a) * h;
    

    //rotate the enemy according to position 
    e.mesh.rotation.z = a + Math.PI/2;

    //we also can set a random scale for each enemy
    var s = 1 + Math.random()*.5;
    e.mesh.scale.set(s,s,s);

    //and now we add the mesh of each enemy to the scene
    this.mesh.add(e.mesh);

}

//NOW WE INSTANTIATE THE SPACESHIP AND ADD IT TO OUR SCENE
var enemyship1;

function createEnemyShip1(){
    enemyship1 = new EnemiesShip1();
    // enemyship1.mesh.scale.set(2, 2, 2);
    enemyship1.mesh.position.y = -600;

	//enemyship1.mesh.rotation.y = -1.57;
    scene.add(enemyship1.mesh);
}

function PrismGeometry( vertices, height ) {

    var Shape = new THREE.Shape();

    ( function f( ctx ) {

        ctx.moveTo( vertices[0].x, vertices[0].y );
        for (var i=1; i < vertices.length; i++) {
            ctx.lineTo( vertices[i].x, vertices[i].y );
        }
        ctx.lineTo( vertices[0].x, vertices[0].y );

    } )( Shape );

    var settings = { };
    settings.amount = height;
    settings.bevelEnabled = false;
    THREE.ExtrudeGeometry.call( this, Shape, settings );

};

PrismGeometry.prototype = Object.create( THREE.ExtrudeGeometry.prototype );

var EnemyShip2 = function(){
    this.mesh = new THREE.Object3D();
	
	//Lower Body
	var geomBodyL = new THREE.SphereGeometry( 6, 8, 6, 0,Math.PI*2,0,1.3 );
    var matBodyL = new THREE.MeshPhongMaterial({color:Colors.black, shading:THREE.FlatShading});

    var bodyL = new THREE.Mesh(geomBodyL, matBodyL);
	bodyL.rotation.x = Math.PI;
	bodyL.scale.x = 2;
	bodyL.scale.y = .7;
    bodyL.castShadow = true;
    bodyL.receiveShadow = true;
    this.mesh.add(bodyL);
	
	//Body Top
	var geomBodyT = new THREE.SphereGeometry( 6, 8, 6, 0,Math.PI*2,0,1.3 );
    var matBodyT = new THREE.MeshPhongMaterial({color:Colors.black, shading:THREE.FlatShading});

    var bodyT = new THREE.Mesh(geomBodyT, matBodyT);
	
	bodyT.position.y = -2.3;
	bodyT.scale.y = .7;
    bodyT.castShadow = true;
    bodyT.receiveShadow = true;
    this.mesh.add(bodyT);
	
	//Body Ring
	var geomBody = new THREE.TorusGeometry( 8, 0.1, 30, 34 );
    var matBody = new THREE.MeshPhongMaterial({color:Colors.black, shading:THREE.FlatShading});

    var body = new THREE.Mesh(geomBody, matBody);
	body.rotation.x = Math.Pi/2;
	bodyT.scale.x = 2;
    body.castShadow = true;
    body.receiveShadow = true;
    this.mesh.add(body);
	
	var geometry2 = new THREE.BoxGeometry( 3, 7, 0.5);
	var material2 = new THREE.MeshPhongMaterial( {color: Colors.enemyRed, shading:THREE.FlatShading} );
	
	var fint = new THREE.Mesh( geometry2, material2 );
	fint.rotation.z = -.9;
	fint.position.set(8,2,0);
	fint.castShadow = true;
    fint.receiveShadow = true;
    this.mesh.add(fint);
	
	var A = new THREE.Vector3( 8, 8,0 );
	var B = new THREE.Vector3( 11, 0,0 );
	var C = new THREE.Vector3( 11, 8,0 );

	var height = 12;                   
	var geometryp = new PrismGeometry( [ A, B, C ], height ); 

	var materialp = new THREE.MeshPhongMaterial( { color: Colors.enemyRed, shading:THREE.FlatShading } );

	var prismt = new THREE.Mesh( geometryp, materialp );
	
	prismt.rotation.z=1.57;
	prismt.position.set(17.7,-5.77,-0.28);
	prismt.scale.z = .05;
	prismt.castShadow = true;
    prismt.receiveShadow = true;
    this.mesh.add(prismt);
	
	var geometry = new THREE.BoxGeometry( 3, 8, 0.5);
	var material = new THREE.MeshPhongMaterial( {color: Colors.enemyRed, shading:THREE.FlatShading} );
	
	var finb = new THREE.Mesh( geometry, material );
	finb.rotation.z = .9;
	finb.position.set(7,-3,-2.5);
	finb.castShadow = true;
    finb.receiveShadow = true;
    this.mesh.add(finb);
	
	var prismb = new THREE.Mesh( geometryp, materialp );
	
	prismb.rotation.z=1.57;
	prismb.rotation.x=3.14;
	prismb.position.set(16.5,4.21,-2.33);
	prismb.scale.z = .05;
	prismb.castShadow = true;
    prismb.receiveShadow = true;
    this.mesh.add(prismb);
	
	var finf = new THREE.Mesh( geometry, material );
	finf.rotation.z = .9;
	finf.position.set(7,-4, 3);
	finf.castShadow = true;
    finf.receiveShadow = true;
    this.mesh.add(finf);
	
	var prismf = new THREE.Mesh( geometryp, materialp );
	
	prismf.rotation.z=1.57;
	prismf.rotation.x=3.14;
	prismf.position.set(16.7,3.51,3.3);
	prismf.scale.z = .05;
	prismf.castShadow = true;
    prismf.receiveShadow = true;
    this.mesh.add(prismf);
	
	//Thruster
	var points = [];
	for ( var i = 0; i < 10; i ++ ) {
		points.push( new THREE.Vector2( Math.sin( i * 0.2 ) * 10 + 5, ( i - 5 ) * 2 ) );
	}
	var geometry = new THREE.LatheGeometry( points );
	var material = new THREE.MeshPhongMaterial( { color: Colors.silver, shading:THREE.FlatShading } );
	var thruster = new THREE.Mesh( geometry, material );
	thruster.scale.set(.2, .2, .2);
	thruster.position.set(11.5,-1,0);
	thruster.rotation.z=-1.57;
	thruster.castShadow = true;
    thruster.receiveShadow = true;
	this.mesh.add(thruster);
	
	/*var geomPit2 = new THREE.SphereGeometry( 14, 3, 31, 0, 0.4, 3, 3.1 );
    var matPit2 = new THREE.MeshPhongMaterial({color:Colors.cockpitGrey, shading:THREE.FlatShading});

    var pit2 = new THREE.Mesh(geomPit2, matPit2);
	
	//pit2.position.y = 18.2;
	pit2.rotation.y=2.5;
	pit2.rotation.x=1.57;
	pit2.scale.set(.25, .20, .20);
	pit2.position.set(-5.5,-1,5);
	//pit2.scale.y = .7;
    this.mesh.add(pit2);*/
	
	
	//Mount for gun
	var geomMount = new THREE.SphereGeometry( 3, 8, 6, 0,Math.PI*2,0,1.3 );
    var matMount = new THREE.MeshPhongMaterial({color:Colors.mountGrey, shading:THREE.FlatShading});

    var mount = new THREE.Mesh(geomMount, matMount);
	mount.position.y = 1;
    mount.castShadow = true;
    mount.receiveShadow = true;
    this.mesh.add(mount);
	
	//Gun
	var geomGun = new THREE.CylinderGeometry( .5, .5, 5, 64 );
    var matGun = new THREE.MeshPhongMaterial({color:Colors.white, shading:THREE.FlatShading});

    var gun = new THREE.Mesh(geomGun, matGun);
	gun.position.set(-2,2.75,0);
	gun.rotation.z = 1.57;
    gun.castShadow = true;
    gun.receiveShadow = true;
    this.mesh.add(gun);

}


EnemiesShip2  = function(){
    this.mesh = new THREE.Object3D;

    var stepAngle = Math.PI*2 / 10;

    var e = new EnemyShip2();

    var a = stepAngle;
    var h = 600 + Math.random() * 200;
    
    e.mesh.position.y = Math.sin(a) * h;
    e.mesh.position.x = Math.cos(a) * h;

    //rotate the enemy according to position 
    e.mesh.rotation.z = a + Math.PI/2;

    //we also can set a random scale for each enemy
    var s = 1 + Math.random()*.5;
    e.mesh.scale.set(s,s,s);

    //and now we add the mesh of each enemy to the scene
    this.mesh.add(e.mesh);

}



//NOW WE INSTANTIATE THE SPACESHIP AND ADD IT TO OUR SCENE
var enemyship2;

function createEnemyShip2(){
    enemyship2 = new EnemiesShip2();
    //enemyship2.mesh.scale.set(1.5, 1.5, 1.5);
    enemyship2.mesh.position.y = -600;
	enemyship2.mesh.rotation.y = 3.14;
    scene.add(enemyship2.mesh);
}


//*********************************************************************************8 */
//*************************************************************************************** */


var sprite;
function createParticle(){
    
    var spriteMap = new THREE.TextureLoader().load("smoke_sprite.png");
    var spriteMaterial = new THREE.SpriteMaterial({map:spriteMap, color: 0xffffff});
    var sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(40, 40, 1);
    sprite.position.y = spaceship.mesh.position.y;
    sprite.position.x = spaceship.mesh.position.x + 10;
    scene.add(sprite);

    setInterval(function(){
         scene.remove(sprite)}, 150);
}


//********************************************************** */


//now we render the scene..and
//we add some life to the scene by making the airplane's propeller spin 
//and by rotating the sea and clouds
function loop(){
    newTime = new Date().getTime();
    deltaTime = newTime-oldTime;
    oldTime = newTime;
    updateDistance();
    //update the ship in each frame
    updateShip();
    
    // Rotate the propeller, the sea and the sky;
    sea.mesh.rotation.z += .005;
    sky.mesh.rotation.z += .01;
    
    enemies.mesh.rotation.z += .005;
    enemies1.mesh.rotation.z += .005;
    enemies2.mesh.rotation.z += .005;
    enemies3.mesh.rotation.z += .005;
    enemies4.mesh.rotation.z += .005;
    enemies5.mesh.rotation.z += .005;;
    enemies6.mesh.rotation.z += .005;
    enemies7.mesh.rotation.z += .005;
    enemies8.mesh.rotation.z += .005;
    enemies9.mesh.rotation.z += .005;

    enemyship1.mesh.rotation.z += .004;
    enemyship2.mesh.rotation.z -= .0045;
    //bullet.mesh.position.x +=.01;
    sea.moveWaves();
    updateCameraFov();
   // bodyBoxed.mesh.position.y = spaceship.mesh.position.y;

   // updateBullet();


   if(keyboard[32] ){ //space bar pressed
        createBullet();
    }
    if(canShoot > 0) canShoot -= 1;
    // for(i = 0; i < ammo.length; i++){
    // bullet.mesh.position.x += .05;
    // //bullet.mesh.quaternion.x += .05;
    // }


    //Create bounded boxes for collision detection
    shipBB = new THREE.Box3().setFromObject(spaceship.mesh);
    enemyBB = new THREE.Box3().setFromObject(enemies.mesh);
    enemy1BB = new THREE.Box3().setFromObject(enemies1.mesh);
    enemy2BB = new THREE.Box3().setFromObject(enemies2.mesh);
    enemy3BB = new THREE.Box3().setFromObject(enemies3.mesh);
    enemy4BB = new THREE.Box3().setFromObject(enemies4.mesh);
    enemy5BB = new THREE.Box3().setFromObject(enemies5.mesh);
    enemy6BB = new THREE.Box3().setFromObject(enemies6.mesh);
    enemy7BB = new THREE.Box3().setFromObject(enemies7.mesh);
    enemy8BB = new THREE.Box3().setFromObject(enemies8.mesh);
    enemy9BB = new THREE.Box3().setFromObject(enemies9.mesh);
    enemyshipBB = new THREE.Box3().setFromObject(enemyship1.mesh);
    var collision = shipBB.isIntersectionBox(enemyBB);
    var collision1 = shipBB.isIntersectionBox(enemyshipBB);
    var collision2 = shipBB.isIntersectionBox(enemy1BB);
    var collision3 = shipBB.isIntersectionBox(enemy2BB);
    var collision4 = shipBB.isIntersectionBox(enemy3BB);
    var collision5 = shipBB.isIntersectionBox(enemy4BB);
    var collision6 = shipBB.isIntersectionBox(enemy5BB);
    var collision7 = shipBB.isIntersectionBox(enemy6BB);
    var collision8 = shipBB.isIntersectionBox(enemy7BB);
    var collision9 = shipBB.isIntersectionBox(enemy8BB);
    var collision10 = shipBB.isIntersectionBox(enemy9BB);
    
    
    if(collision){
        appendText("hit");
        //SpawnedParticles(enemies.mesh.position.clone(), 15, Colors.red, 3);
        createParticle();
        scene.remove(enemies.mesh);
        createEnemies();
    }else if(collision1){
        appendText("hit");
        createParticle();
        scene.remove(enemyship1.mesh);
        createEnemyShip1();
    }else if(collision2){
        appendText("hit");
        createParticle();
        scene.remove(enemies1.mesh);
        createEnemies1();
    }else if(collision3){
        appendText("hit");
        createParticle();
        scene.remove(enemies2.mesh);
        createEnemies2();
    }else if(collision4){
        appendText("hit");
        createParticle();
        scene.remove(enemies3.mesh);
        createEnemies3();
    }else if(collision5){
        appendText("hit");
        createParticle();
        scene.remove(enemies4.mesh);
        createEnemies4();
    }else if(collision6){
        appendText("hit");
        createParticle();
        scene.remove(enemies5.mesh);
        createEnemies5();
    }else if(collision7){
        appendText("hit");
        createParticle();
        scene.remove(enemies6.mesh);
        createEnemies6();
    }else if(collision8){
        appendText("hit");
        createParticle();
        scene.remove(enemies7.mesh);
        createEnemies7();
    }else if(collision9){
        appendText("hit");
        createParticle();
        scene.remove(enemies8.mesh);
        createEnemies8();
    }else if(collision10){
        appendText("hit");
        createParticle();
        scene.remove(enemies9.mesh);
        createEnemies9();
    }else{
        clearText();
    }

    // render the scene
  
    renderer.render(scene, camera);
    // call the loop function again
    requestAnimationFrame(loop);
    
}

function updateDistance(){
	countT += 1
	if(countT % 5 == 0){
		score += 1;
		document.getElementById("distValue").innerHTML = score;
	}
}

function updateShip(){
    // We move the spaceship between -100 and 100 on the horizontal axis,
    // and between 25 and 175 on the verticle axis
    // depending on the mouse position which ranges between -1 and 1 on both axes;
    // to achieve that we use a normalize function (below)
    var targetY = normalize(mousePos.y, -.75, .75, game.shipDefaultHeight-game.shipAmpHeight, game.shipDefaultHeight+game.shipAmpHeight);
    var targetX = normalize(mousePos.x, -1, 1, -game.shipAmpWidth*.7, -game.shipAmpWidth);

    // Move the ship at each frame by adding a fraction of the the remaining distance
    spaceship.mesh.position.y += (targetY-spaceship.mesh.position.y)*0.1;

    // Rotate the plane proportionally to the remaining distance
	spaceship.mesh.rotation.z = (targetY-spaceship.mesh.position.y)*0.0128;
	spaceship.mesh.rotation.x = (spaceship.mesh.position.y-targetY)*0.0064;

}

function updateBullet(){
    // var targetX = normalize(bullet.mesh.position.x, -.75, .75, 0, 150);

    // bullet.mesh.position.x += (targetX-bullet.mesh.position.x) * 0.1;
    for(var i = 0; i < ammo.length; i ++){
        bulletInUse[i].position.copy(ammo[i].position);
        bulletInUse[i].quaternion.copy(ammo[i].quaternion);
        // bullet.mesh.position.copy(ammo[i].position);
        // bullet.mesh.quaternion.copy(ammo[i].quaternion);
        bullet.mesh.position.x += .5;
    }
    time = Date.now();
}


function normalize(v, vmin, vmax, tmin, tmax){
    var nv = Math.max(Math.min(v,vmax), vmin);
    var dv = vmax-vmin;
    var pc = (nv-vmin)/dv;
    var dt = tmax-tmin;
    var tv = tmin + (pc*dt);
    return tv;
}

// ALL MAIN FUNCTIONS WE NEED TO CREATE ARE PUT INTO THE INIT FUNCTION
function init(){
    document.addEventListener('mousemove', handleMouseMove, false)
    
  //  raycaster = new THREE.Raycaster();
    // set up the scene, the camera and the renderer
    resetGame();
    createScene();

    // add the lights
    createLights();


    // add the objects
    createShip();
    createSea();
    createSky();
    createEnemies();

    createEnemies1();
    createEnemies2();
    createEnemies3();
    createEnemies4();
    createEnemies5();
    createEnemies6();
    createEnemies7();
    createEnemies8();
    createEnemies9();
   // createBodyBoxed();
   	createEnemyShip1();
	createEnemyShip2();


    

    // setInterval(function(){
    //     render.setClearColor(0x4a4a4a, 1)}, 3000);
    //renderer.setClearColor (0xe4e0ba, 1);
   // renderer.setClearColor (0x4a4a4a, 1);
    // start a loop that will update the objects' positions
    // and reder the scene on each frame
    
    loop();

}

//change sky color
function changeScene(){
    
     //renderer.setClearColor (0xBCAAA4, 1);
    // shadowLight = new THREE.DirectionalLight(0xffffff, .2);
    //  shadowLight = THREE.DirectionalLight(0xffffff, .2);
           
        
}
function updateCameraFov(){
  camera.fov = normalize(mousePos.x,-1,1,40, 80);
  camera.updateProjectionMatrix();
}

// HANDLE MOUSE EVENTS

var mousePos = { x: 0, y: 0 };

function handleMouseMove(event) {
    
    // here we are converting the mouse position value received
    // to a normalized value varying between -1 and 1;
    // this is the formula for the horizontal axis:

  var tx = -1 + (event.clientX / WIDTH)*2;

    // for the vertical axis, we need to inverse the formula
    // because the 2D y-axis goes the opposite direction of the 3D y-axis
  
  var ty = 1 - (event.clientY / HEIGHT)*2;
  mousePos = {x:tx, y:ty};
  //NOW THAT WE HAVE A NOMRALIZED X AND Y POSITION OF THE MOUSE, WE CAN MOVE THE AIRPLANE PROPERLY
}

function keyDown(event){
	keyboard[event.keyCode] = true;
}

function keyUp(event){
	keyboard[event.keyCode] = false;
}

window.addEventListener('keydown', keyDown);
window.addEventListener('keyup', keyUp);
window.addEventListener('load', init, false);
