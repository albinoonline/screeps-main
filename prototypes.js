module.exports = function() {
	
	//build stuffs
	Room.prototype.createBuildSite = function(x,y,structure){
		if (typeof this.memory.buildSites == "undefined"){
			//make an empty 3d array
			this.memory.buildSites = Array(50).fill().map(a=>Array(50).fill().map(b=>[]));
		}
		//duplicate protection
		if (this.memory.buildSites[x][y].includes(structure) ==false){
			this.memory.buildSites[x][y].push(structure);
		}
	}
	
	
	//isWall
	Room.prototype.isWall = function(x,y){
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
	
	
	//distance propagation
	RoomPosition.prototype.propagateDistances = function(display = false){
		let x=this.x;
		let y=this.y;
		let room= Game.rooms[this.roomName];
		let toDo = [{x:x, y:y, value:0}];
		let result = Array(50).fill().map(a=>[]);
		result[x][y]=0;
		//ensure terrain Martix exists.
		if (typeof room.memory.terrainMatrix === "undefined"){
			var terrainMatrix = [];
			let terrain = room.getTerrain();
			for(let x = 0; x < 50; x++){
				terrainMatrix[x] = [];
				for(let y = 0; y < 50; y++){
					terrainMatrix[x][y] = terrain.get(x,y);
				}
			}
			room.memory.terrainMatrix = terrainMatrix;
		} else {
			var terrainMatrix = room.memory.terrainMatrix;
		}
		while (toDo.length !=0){
			let current = toDo.shift();
			//this will contain the surrounding tiles
			let adjacent = [];
			//this stops checking tiles near the border.
			if (current.x < 49 && current.x > 0 && current.y < 49 && current.y > 0){
				//here we actually fill the array.
				adjacent.push({x:current.x-1,y:current.y-1},{x:current.x,y:current.y-1},
				{x:current.x+1,y:current.y-1},{x:current.x-1,y:current.y},
				{x:current.x+1,y:current.y},{x:current.x-1,y:current.y+1},
				{x:current.x,y:current.y+1},{x:current.x+1,y:current.y+1});
			}
			//iterate through surrounding tiles
			for (i in adjacent){
				let tile = adjacent[i];
				//this checks the roomMap for non-walls and that we have yet to check the tile
				if (room.isWall(tile.x, tile.y)==false && typeof result[tile.x][tile.y] === "undefined"){
					//add value to object
					tile.value=current.value+1;
					//push object onto the queue
					toDo.push(tile);
					//push object onto the returning array
					result[tile.x][tile.y] = tile.value;
				}
			}//end area check
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