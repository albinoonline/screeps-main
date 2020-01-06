module.exports = function() {
	Room.prototype.moveOrder = function(name,x,y){
		//filter mt name
		//make sure no entry exists
		//find previus entry
		if (typeof this.memory.moveQueue == "undefined"){
			this.memory.moveQueue =[];
		}
		
		let previus = this.memory.moveQueue.findIndex(function(o){return (o.creep = name)});
		//remove previus entry
		if (previus !=-1){
			this.memory.moveQueue.splice(previus,1);
		}
		//add new entry
		this.memory.moveQueue.push({creep: name, x:x, y:y});
	}
	
	//build stuffs
	Room.prototype.createBuildSite = function(x,y,structure){
		//read empty memory protection
		if (typeof this.memory.buildSites == "undefined"){
			//make an empty 3d array
			this.memory.buildSites = Array(50).fill().map(a=>Array(50).fill().map(b=>[]));
		}
		//duplicate protection
		if (this.memory.buildSites[x][y].includes(structure) ==false){
			this.memory.buildSites[x][y].push(structure);
		}
		///road removal unless placing rampart or container
	}
	
	//isWall
	Room.prototype.isWall = function(x,y){
		console.log("isWall was called");///trying to phase out
		//ensure terrain Martix exists.
		if (typeof this.memory.terrainMatrix === "undefined"){
			var terrainMatrix = [];
			let terrain = this.getTerrain();
			for(let x = 0; x < 50; x++){
				terrainMatrix[x] = [];
				for(let y = 0; y < 50; y++){
					terrainMatrix[x][y] = terrain.get(x,y);
				}
			}
			this.memory.terrainMatrix = terrainMatrix;
		} else {
			var terrainMatrix = this.memory.terrainMatrix;
		}
		return (terrainMatrix[x][y] == 1);
	}
	
	//creep build code
	Creep.prototype.BS = function(refillAction,refillTarget){
		console.log("BS was called");///trying to phase out
		let tag = "[BS 2.1]";
		if (typeof this.memory.goal == "undefined"){
			var goal = this.memory.goal = this.jobFind();
		} else {
			var goal = this.memory.goal;
		}
		
		this.moveTo(this.room.getPositionAt(goal.x, goal.y));
		let target = Game.getObjectById(goal.id);
		if (target == null){
			console.log(tag+'No target, perhabs job is done.');
			delete this.memory.goal;
			this.room.jobCheck(goal.job, goal.id);
			return false;
		}
		if (goal.job == "build"){
			//get a roompos to work with
			let build = this.build(target);
			if (build == ERR_INVALID_TARGET){
				delete this.memory.goal;
				console.log(tag+'Invalid target, perhabs job is done.');
				this.room.jobCheck(goal.job, goal.id);
			}
			if (build == ERR_NOT_ENOUGH_RESOURCES){
				this.memory.action = refillAction;
				this.memory.target = refillTarget;
			}
		} else if (goal.job == "fix"){//fix 
			if (target.hits == target.hitsMax){
				console.log(tag+'Fixed target, job is done.');
				delete this.memory.goal;
				this.room.jobCheck(goal.job, goal.id);
			} else {
				let repair = this.repair(target);
				if (repair == ERR_INVALID_TARGET){
					console.log(tag+'Invalid target, perhabs job is done.');
					delete this.memory.goal;
					room.jobCheck(goal.job, goal.id);
				}
				if (repair == ERR_NOT_ENOUGH_RESOURCES){
					this.memory.action = refillAction;
					this.memory.target = refillTarget;
				}
			}
		} else if (goal.job == "wait"){//wait
			if (goal.id <1){
				this.room.memory.buildQueue = generateQueue(this.room);
			} else {
				goal.id -=1;
			}
		} else {//error
			console.log(tag+"broken as fuck: "+goal.job);
		}//job found
	}//end function
	
	//distance propagation
	RoomPosition.prototype.propagateDistances = function(includeSelf = false, matrixOverride = false, display = false){
		//include self. should the returned matrix include self?
		//terrain matrix is a custom terrain matrix, (as a 2 dimentanal array) if you want to exclude something, overwrite it as a wall.
		//display should the result be displayed as a room visual
		//returns x y matrix of the route distance, or undefined
		//create some shortened variables
		let x=this.x;
		let y=this.y;
		let room = Game.rooms[this.roomName];
		//creates a queue
		let toDo = [{x:x, y:y, value:0}];
		//create an empty array that we will return
		let result = Array(50).fill().map(a=>[]);
		
		// if include Selft is true, set the distance for the initial point to 0
		if (includeSelf){
			result[x][y]=0;
		}
		
		//check if terrain matrix is supplied
		if (matrixOverride != false) {
			var terrainMatrix = matrixOverride;
		} else {//generate terrain matrix
			//create terrain matrix for the room.
			var terrainMatrix = [];
			let terrain = room.getTerrain();
			for(let x = 0; x < 50; x++){
				terrainMatrix[x] = [];
				for(let y = 0; y < 50; y++){
					terrainMatrix[x][y] = terrain.get(x,y);
				}
			}
		}//end matrix
		
		//queue is array toDo, while its length is not zero work on an item in the queue
		while (toDo.length !=0){
			//remove an element from the queue to work on.
			let current = toDo.shift();
			//this cheks that we are not out of bounds.
			if (current.x < 49 && current.x > 0 && current.y < 49 && current.y > 0){
				//this will contain the surrounding tiles
				let adjacent = [
				{x:current.x-1,y:current.y-1},{x:current.x,y:current.y-1},
				{x:current.x+1,y:current.y-1},{x:current.x-1,y:current.y},
				{x:current.x+1,y:current.y},{x:current.x-1,y:current.y+1},
				{x:current.x,y:current.y+1},{x:current.x+1,y:current.y+1}];
				
				//iterate through surrounding tiles
				for (i in adjacent){
					let tile = adjacent[i];
					//this checks the roomMap for non-walls and that we have yet to check the tile 
					if (terrainMatrix[tile.x][tile.y] != 1 && typeof result[tile.x][tile.y] === "undefined"){
						//add value to object
						tile.value=current.value+1;
						//push object onto the queue
						toDo.push(tile);
						//push object onto the returning array
						result[tile.x][tile.y] = tile.value;
					}
				}//end area check
			} // we are out of bounds since the already shifted, we just let the while progress
		}//end while
		
		//display
		if (display){
			for(let x in result){
				for(let y in result[x]){
					//optional display
					new RoomVisual().text(result[x][y], (x-0), (y-(-0.175)), {color:'green', font:.5});
				}
			}
		}
		return result;
	}//end distance propagation
};