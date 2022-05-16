/***** TITLE *****/
// Particle Mouse Tracker
/*****************/

/***** AUTHOR *****/
// Bryce Paubel
/******************/

/***** DESCRIPTION *****/
// This simple program inserts a particle trail
// which will follow the mouse cursor. Some CSS
// may have to be done to make sure it overlays properly
/***********************/

/***** SETUP *****/
// Insert this script and the libraries included into your HTML
// Set the body 'onload' event to 'initMouseTracker()'
// Some extra CSS and JavaScript will likely be needed to make sure the overlay works
/*****************/

/***** COPYRIGHT *****/
// Copyright 2022 Bryce Paubel
/*********************/

/***** LICENSING *****/
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 2 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License along
// with this program; if not, write to the Free Software Foundation, Inc.,
// 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
/*********************/

const V_SHADER_SOURCE = `#version 300 es
	in vec2 a_p;		// Position
	in float a_p_s;		// Point size
	
	void main() {
		gl_PointSize = a_p_s;
		gl_Position = vec4(a_p, 0.0, 1.0);
	}
`

const F_SHADER_SOURCE = `#version 300 es
	precision highp float;
	out vec4 out_c; // Output color
	
	uniform vec4 u_c;	// Input color
	
	void main() {
		if ( length( gl_PointCoord - vec2( 0.5, 0.5 ) ) > 0.475 ) discard; 
		out_c = u_c;
	}
`

// Configuration object
let config = {
	MOUSE: null,
	MOUSE_MOVEMENT: [],
	SELECTION: 0,
	PARTICLES: 10,
	SLUGGISH: false,
}

// Main program
function initMouseTracker() {
	// Animation ID
	let animID = 1;
	
	// Particle array
	let particles = [];
	
	// Initialize canvas
	// Initialize canvas
	let canvas = document.createElement("canvas");
	canvas.style.overflow = "hidden";
	canvas.style.zIndex = 100;
	canvas.style.position = "absolute";
	canvas.style.pointerEvents = "none";
	canvas.style.padding = 0;
	canvas.style.margin = 0;
	canvas.width = 1.0 * window.innerWidth;
	canvas.height = 1.01 * window.innerHeight;
	
	document.body.appendChild(canvas);
	
	// Get rendering context and initialize shaders
	let webGL = canvas.getContext("webgl2");
	initShaders(webGL, V_SHADER_SOURCE, F_SHADER_SOURCE);
	
	console.log(canvas);

	setWindowEvents(canvas);

	for (let i = 0; i < config.PARTICLES; i++) {		
		particles.push(new Particle(
			Math.log(i + 100000), 
			[0.0, 0.0], 
			[0.0, 0.0], 
			[0, 0, 1.0 - (i + 1) / (config.PARTICLES + 1) * 0.8 + 0.2, 1.0 / (1 + 2 * i)], 
			i));
		console.log(particles[i]);
	}
	
	let update = function() {
		cancelAnimationFrame(animID);		
		webGL.clearColor(0.0, 0.0, 0.0, 0.0);
		webGL.clear(webGL.COLOR_BUFFER_BIT);
		drawParticles(canvas, webGL, particles);
		animID = requestAnimationFrame(update);
	}
	
	update();
}

// Draw a particle array
function drawParticles(canvas, webGL, particleArray) {
	for (let i = particleArray.length - 1; i >= 0; i--) {
		updateParticle(canvas, config.SELECTION, particleArray[i]);
		drawParticle(webGL, particleArray[i]);
	}
}

// Update a particle
function updateParticle(canvas, selection, particle) {
	switch (selection) {
		case 0: 
			followCursor(canvas, particle);
			break;
		case 1:
			followCursorCircle(canvas, particle);
			break;
		case 2:
			followCursorSloppyOrbit(canvas, particle);
			break;
		case 3:
			followCursorSharpOrbit(canvas, particle);
			break;
		case 4:
			followCursorGalaxy(canvas, particle);
			break;
	}
}

// Set the window events to update the mouse position
function setWindowEvents(canvas) {
	window.onmousemove = function(e) {
		config.MOUSE = [e.clientX, e.clientY];
		config.MOUSE_MOVEMENT = [e.movementX, e.movementY];
	}
	
	window.onmouseout = function() {
		config.MOUSE = null;
	}
}

// Draw a singular particle
function drawParticle(gl, particle) {
	// Vertex shader pointers
	let a_p = gl.getAttribLocation(gl.program, "a_p");
	let a_p_s = gl.getAttribLocation(gl.program, "a_p_s");
	
	// Fragment shader pointers
	let u_c = gl.getUniformLocation(gl.program, "u_c");
	
	gl.vertexAttrib2f(a_p, particle.position[0], particle.position[1]);
	gl.vertexAttrib1f(a_p_s, particle.size);
	gl.uniform4f(u_c, particle.color[0], particle.color[1], particle.color[2], particle.color[3]);
	gl.drawArrays(gl.POINTS, 0, 1);
}

// Update particle to follow the cursor
function followCursor(canvas, particle) {
	if (config.MOUSE) {
		particle.velocity = [(2 * config.MOUSE[0] / canvas.width) - 1 - particle.position[0], (2 * config.MOUSE[1] / (-canvas.height)) + 1 - particle.position[1]];
		if (config.SLUGGISH) {
			particle.velocity = [particle.velocity[0] * 0.98 * (1 / (particle.scale + 1)), particle.velocity[1] * 0.98 * (1 / (particle.scale + 1))];
		} else {
			particle.velocity = [particle.velocity[0] * 1 / Math.log(particle.scale + 5), particle.velocity[1] * 1 / Math.log(particle.scale + 5)];
		}
		particle.position = [particle.position[0] + particle.velocity[0], particle.position[1] + particle.velocity[1]];
	}
}

// Update particle to follow the cursor in a circular fashion
function followCursorCircle(canvas, particle) {
	if (config.MOUSE) {
		let centerVelo = [(2 * config.MOUSE[0] / canvas.width) - 1 - particle.position[0], (2 * config.MOUSE[1] / (-canvas.height)) + 1 - particle.position[1]];
		let perpendicularVelo = [-centerVelo[1], centerVelo[0]];
		
		particle.velocity = [
			centerVelo[0] * particle.scale + perpendicularVelo[0] * particle.scale,
			centerVelo[1] * particle.scale + perpendicularVelo[1] * particle.scale
		];
		
		particle.position = [
			particle.position[0] + particle.velocity[0], 
			particle.position[1] + particle.velocity[1]
		];
	}
}

// Update particle to orbit
function followCursorSloppyOrbit(canvas, particle) {
	if (config.MOUSE) {
		let glMouseCoords = [(2 * config.MOUSE[0] / canvas.width) - 1, (2 * config.MOUSE[1] / (-canvas.height)) + 1];	
			
		let centerVelo = [glMouseCoords[0] - particle.position[0], glMouseCoords[1] - particle.position[1]];
		
		let perpendicularVelo = [-centerVelo[1], centerVelo[0]];
		
		let centerMag = Math.sqrt(centerVelo[0] ** 2 + centerVelo[1] ** 2);		
		if (centerMag < 0.2) {
			centerVelo = [0.0, 0.0];
		}
		
		particle.velocity = [
			config.MOUSE_MOVEMENT[0] / 1000 + perpendicularVelo[0] * particle.scale * 0.2 + centerVelo[0] * 0.02,
			-config.MOUSE_MOVEMENT[1] / 1000 + perpendicularVelo[1] * particle.scale * 0.2 + centerVelo[1] * 0.02
		];
		
		particle.position = [
			particle.position[0] + particle.velocity[0], 
			particle.position[1] + particle.velocity[1]
		];
	}
}

// Update particle to orbit sharply
function followCursorSharpOrbit(canvas, particle) {
	if (config.MOUSE) {
		let glMouseCoords = [(2 * config.MOUSE[0] / canvas.width) - 1, (2 * config.MOUSE[1] / (-canvas.height)) + 1];	
			
		let centerVelo = [glMouseCoords[0] - particle.position[0], glMouseCoords[1] - particle.position[1]];
		
		let perpendicularVelo = [-centerVelo[1], centerVelo[0]];

		let centerMag = Math.sqrt(centerVelo[0] ** 2 + centerVelo[1] ** 2);	
		let isOrbiting = false;
		if (centerMag < 0.2 && centerMag > 0.15) {
			centerVelo = [0.0, 0.0];
		} else if (centerMag <= 0.15) {
			centerVelo = [-0.5 * centerVelo[0], -0.5 * centerVelo[1]];
		} else if (centerMag > 0.2 && centerMag < 0.2) {
			centerVelo = [0.1 * centerVelo[0], 0.1 * centerVelo[1]];
		}
		particle.velocity = [
			config.MOUSE_MOVEMENT[0] / 1000 + perpendicularVelo[0] * particle.scale * 0.3 + centerVelo[0] * 0.02,
			-config.MOUSE_MOVEMENT[1] / 1000 + perpendicularVelo[1] * particle.scale * 0.3 + centerVelo[1] * 0.02
		];
		
		particle.position = [
			particle.position[0] + particle.velocity[0], 
			particle.position[1] + particle.velocity[1]
		];
	}
}

// Update particle to strike through the center
function followCursorGalaxy(canvas, particle) {
	if (config.MOUSE) {
		let glMouseCoords = [(2 * config.MOUSE[0] / canvas.width) - 1, (2 * config.MOUSE[1] / (-canvas.height)) + 1];	
			
		let centerVelo = [glMouseCoords[0] - particle.position[0], glMouseCoords[1] - particle.position[1]];
		
		let perpendicularVelo = [-centerVelo[1], centerVelo[0]];

		let centerMag = Math.sqrt(centerVelo[0] ** 2 + centerVelo[1] ** 2);		
	
		perpendicularVelo = [(1 / centerMag) * perpendicularVelo[0], (1 / centerMag) * perpendicularVelo[1]];
		
		particle.velocity = [
			config.MOUSE_MOVEMENT[0] / 1000 + perpendicularVelo[0] * particle.scale * 0.1 + centerVelo[0] / particle.scale * 0.01,
			-config.MOUSE_MOVEMENT[1] / 1000 + perpendicularVelo[1] * particle.scale * 0.1 + centerVelo[1] / particle.scale * 0.01
		];
		
		particle.position = [
			particle.position[0] + particle.velocity[0], 
			particle.position[1] + particle.velocity[1]
		];
	}
}

// Particle constructor
function Particle(size, position, velocity, color, scale) {
	this.size = size;
	this.position = position;
	this.velocity = velocity;
	this.color = color;
	this.scale = scale;
}

