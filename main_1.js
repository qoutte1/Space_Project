// COLORS
var Colors = {
    red:0xf25346,
	white:0xd8d0d1,
	brown:0x59332e,
	pink:0xF5986E,
	brownDark:0x23190f,
	blue:0x68c3c0,

    SandyBrown:0xF4A460,
};




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
    sea.mesh.position.y = -600;

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
    sky.mesh.position.y = -600;
    scene.add(sky.mesh);

}

//******************************************************** */
//**CODE FOR PLANE HERE */
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

    //ENGINE 1 (BOTTOM-BACK)
    var geomEngine4 = new THREE.CylinderGeometry(5, 5, 40, 8, 1, false);
    var matEngine4 = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.FlatShading});

    var engine4 = new THREE.Mesh(geomEngine4, matEngine4);
    engine4.rotation.z = 0.5 * Math.PI;
    engine4.position.set(-45, -15, -15);
    engine4.castShadow = true;
    engine4.receiveShadow = true;
    this.mesh.add(engine4);

    // //CREATE the engine
    // var geomEngine = new THREE.CylinderGeometry(30, 30, 20, 6, 1,  false);
    // var matEngine = new THREE.MeshPhongMaterial({color:Colors.blue, shading:THREE.FlatShading});
    // var engine = new THREE.Mesh(geomEngine, matEngine);
    // engine.rotation.z = 0.5 * Math.PI;
    // engine.position.x = -50;
    // engine.receiveShadow = true;
    // this.mesh.add(engine);

    // // Create the tail
    // var geomTailPlane = new THREE.BoxGeometry(15, 80, 5, 1, 1, 1);
    // var matTailPlane = new THREE.MeshPhongMaterial({color:Colors.white, shading:THREE.FlatShading});
	// var tailPlane = new THREE.Mesh(geomTailPlane, matTailPlane);
    // tailPlane.position.set(-35, 0, 0);
    // tailPlane.castShadow = true;
    // tailPlane.receiveShadow = true;
    // this.mesh.add(tailPlane);

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




    // // propeller
    // var geomPropeller = new THREE.BoxGeometry(20, 15, 10, 1, 1, 1);
    // var matPropeller = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.FlatShading});
	// this.propeller = new THREE.Mesh(geomPropeller, matPropeller);
    // this.propeller.castShadow = true;
    // this.receiveShadow = true;

    // this.propeller.position.set(40, 0, 0);
    // this.mesh.add(this.propeller);
}

//NOW WE INSTANTIATE THE SPACESHIP AND ADD IT TO OUR SCENE
var spaceship;

function createShip(){
    spaceship = new SpaceShip();
    spaceship.mesh.scale.set(.25, .25, .25);
    spaceship.mesh.position.y = 100;
    scene.add(spaceship.mesh);
}
//********************************************************** */

//now we render the scene..and
//we add some life to the scene by making the airplane's propeller spin 
//and by rotating the sea and clouds
function loop(){
    // Rotate the propeller, the sea and the sky
   // airplane.propeller.rotation.x += 0.3;
    sea.mesh.rotation.z += .005;
    sky.mesh.rotation.z += .01;

    //update the ship in each frame
    updateShip();
    sea.moveWaves();

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
    var targetX = normalize(mousePos.x, -.75, .75, -100, 100);
    var targetY = normalize(mousePos.y, -.75, .75, 25, 175);

    // Move the ship at each frame by adding a fraction of the the remaining distance
    spaceship.mesh.position.y += (targetY-spaceship.mesh.position.y)*0.1;

    // Rotate the plane proportionally to the remaining distance
	spaceship.mesh.rotation.z = (targetY-spaceship.mesh.position.y)*0.0128;
	spaceship.mesh.rotation.x = (spaceship.mesh.position.y-targetY)*0.0064;

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
    createScene();

    // add the lights
    createLights();


    // add the objects
    createShip();
    createSea();
    createSky();
    

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
            renderer.setClearColor (0x4a4a4a, 1);
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

window.addEventListener('load', init, false);
