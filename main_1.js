// COLORS
var Colors = {
    red:0xf25346,
	white:0xd8d0d1,
	brown:0x59332e,
	pink:0xF5986E,
	brownDark:0x23190f,
	blue:0x68c3c0,

    SandyBrown:0xF4A460,
    orange:0xFF6D00,
    black: 0x212121,
};

var keyboard = {};
 
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
var ennemiesPool = [];
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

          level:1,
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

          ennemyDistanceTolerance:10,
          ennemyValue:10,
          ennemiesSpeed:.6,
          ennemyLastSpawn:0,
          distanceForEnnemiesSpawn:50,

          status : "playing",
         };
 // fieldLevel.innerHTML = Math.floor(game.level);
}

//-----------------------------------------------------


// THREEJS RELATED VARIABLES
var scene,
            camera, fieldOfView, aspectRatio, nearPlane, farPlane, HEIGHT, WIDTH,
            renderer, container;

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
    var geom = new THREE.CylinderGeometry(600, 600, 800, 40, 10);
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

//************************************************************************************ */

//********************************************************** */




//now we render the scene..and
//we add some life to the scene by making the airplane's propeller spin 
//and by rotating the sea and clouds
function loop(){

    // newTime = new Date().getTime();
    // deltaTime = newTime-oldTime;
    // oldTime = newTime;

    // Rotate the propeller, the sea and the sky;
    sea.mesh.rotation.z += .005;
    sky.mesh.rotation.z += .01;


    //update the ship in each frame
    updateShip();
    sea.moveWaves();
    updateBullet();


//     if (Math.floor(game.distance)%game.distanceForEnnemiesSpawn == 0 && Math.floor(game.distance) > game.ennemyLastSpawn){
//       game.ennemyLastSpawn = Math.floor(game.distance);
//       ennemiesHolder.spawnEnnemies();
//  }

   if(keyboard[32] ){ //space bar pressed
        createBullet();
    }
    if(canShoot > 0) canShoot -= 1;
    //controls.update(Date.now() - time);

    //setInterval(changeScene, 3000);
    // render the scene
    renderer.render(scene, camera);
    // call the loop function again
    requestAnimationFrame(loop);
    
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
        // bulletInUse[i].position.copy(ammo[i].position);
        // bulletInUse[i].quaternion.copy(ammo[i].quaternion);
        bullet.mesh.position.copy(ammo[i].position);
        bullet.mesh.quaternion.copy(ammo[i].quaternion);
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
    // set up the scene, the camera and the renderer
     resetGame();
    createScene();

    // add the lights
    createLights();


    // add the objects
    createShip();
    createSea();
    createSky();
    // createEnnemies();
    // createParticles();

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
    var count = 4;
    var i;
    for(i = 0; i < count; i++){
        if(i == 1){
            renderer.setClearColor (0x4a4a4a, 1);
        } else if(i == 2){
            renderer.setClearColor (0xe4e0ba, 1);
        } else if(i == 3){
            renderer.setClearColor (0xBCAAA4, 1);
           
        } else{
            renderer.setClearColor (0xe4e0ba, 1);
        }
        
    }
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
