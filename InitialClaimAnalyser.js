
/*
//functions 
*/
function  plotBase(x,y, goals, room){
	//returns false if base plot failed
	//returns true if base plot can be successful, saving values in memory
	x=parseInt(x);
	y=parseInt(y);
	//this will contain the surrounding tiles
	let hub = [];
	//this stops checking tiles near the border.
	if (x < 49 && x > 0 && y < 49 && y > 0){
		//here we actually fill the array.
		hub = sitePlan(x,y);
	}
	
	//make sure no placement locations are walls
	for (i in hub){
		if (room.memory.terrainMatrix[hub[i].x][hub[i].y] == 1){
			return false;
		}
	}
	//make sure goals aren't too close
	if (room.getPositionAt(x,y).findInRange(goals,3).length !=0){
		return false;
	}
	//at this point the location is valid, so weil start pre plotting the  room.
	
	//create hub goal for road plotting.
	let hubGoal = room.getPositionAt(x,y);
	//paths are all the road stuffs
	let paths = [];
	//plan roads
	for(let i in goals){
		let goal = goals[i];
		
		//save path
		let path = PathFinder.search(goal.pos, hubGoal, {
			swampCost:1,
			plainCost:1,
			roomCallback: function() {
				//use custom costmatrix
				return PathFinder.CostMatrix.deserialize(room.memory.ICA.costMatrix);
			}
		}).path;
		
		//kill the nearest roads (they are part of the hub)
		path.pop();
		path.pop();
		//reformat roads and give them structure type
		for(let i in path){
			path[i] = {x:path[i].x, y:path[i].y, structure:STRUCTURE_ROAD};
		}
		//save container
		path.push({x:path[0].x, y:path[0].y, structure:STRUCTURE_CONTAINER});
		//add paths together
		paths = paths.concat(path);
	}
	//hub is the hub biuldings
	//buildSites are my own replacement for construction sites
	let buildSites = hub.concat(paths);
	//locations are things like mining sites tug site and other non structure base locations
	let locations = [{x:x,y:y, type:"tug"}];

	for(let i in buildSites){
		let tile=buildSites[i];
		if (tile.structure == "road"){
			//display biuldsites
			new RoomVisual(room.name).text("road", tile.x, tile.y+0.15, {color: 'blue', font: 0.45});
		} else {
			//display biuldsites
			new RoomVisual(room.name).text(tile.structure.substring(0, 5), tile.x, tile.y-0.15, {color: 'orange', font: 0.35});
		}
		if (tile.structure == STRUCTURE_CONTAINER){
			//generate harvest upgrade and recycle sites
			let roomPos = room.getPositionAt(tile.x, tile.y);
			if (roomPos.findInRange(FIND_SOURCES, 1).length ==1){
				//site is harvest
				locations.push({x:tile.x, y:tile.y, type:"harvest"});
				//display location
			} else if (roomPos.getRangeTo(room.controller)==1) {
				//site is controller
				locations.push({x:tile.x, y:tile.y, type:"upgrade"});
				//display location
			} else {
				//site is recycle
				locations.push({x:tile.x, y:tile.y, type:"recycle"});
				//display location
			}
		}
	}
	//optional display
	for (let j in locations){
		let tile = locations[j];
		new RoomVisual(room.name).text(tile.type, tile.x, tile.y+0.4, {color: 'yellow', font: 0.3});
	}
	//save to memory
	room.memory.ICA.buildSites = buildSites;
	room.memory.ICA.ready = true;
	room.memory.ICA.locations = locations;
	return true;
}//end function
function sitePlan(x,y){
	x=parseInt(x);
	y=parseInt(y);
	//this is the site we plan on making, at some point i may make this read from memory, or if its possible, github
	return [
	{x:x-1,y:y-2, structure:STRUCTURE_ROAD},
	{x:x,y:y-2, structure:STRUCTURE_ROAD},
	{x:x+1,y:y-2, structure:STRUCTURE_ROAD},
	{x:x-2,y:y-1, structure:STRUCTURE_ROAD},
	{x:x+2,y:y-1, structure:STRUCTURE_ROAD},
	{x:x-2,y:y, structure:STRUCTURE_ROAD},
	{x:x+2,y:y, structure:STRUCTURE_ROAD},
	{x:x-2,y:y+1, structure:STRUCTURE_ROAD},
	{x:x+2,y:y+1, structure:STRUCTURE_ROAD},
	{x:x-1,y:y+2, structure:STRUCTURE_ROAD},
	{x:x,y:y+2, structure:STRUCTURE_ROAD},
	{x:x+1,y:y+2, structure:STRUCTURE_ROAD},
	{x:x,y:y, structure:STRUCTURE_ROAD},
	{x:x+1,y:y, structure:STRUCTURE_ROAD},
	{x:x-1,y:y-1, structure:STRUCTURE_EXTENSION},
	{x:x,y:y-1, structure:STRUCTURE_SPAWN},
	{x:x+1,y:y-1, structure:STRUCTURE_LINK},
	{x:x-1,y:y, structure:STRUCTURE_EXTENSION},
	{x:x+1,y:y, structure:STRUCTURE_CONTAINER},
	{x:x-1,y:y+1, structure:STRUCTURE_EXTENSION},
	{x:x,y:y+1, structure:STRUCTURE_EXTENSION},
	{x:x+1,y:y+1, structure:STRUCTURE_EXTENSION}
	];
}

module.exports = {
	run:function(room){
		
		//check to see if ICA exists in memory
		if (typeof room.memory.ICA === "undefined"){
			console.log("[ICA]Init");
			delete room.memory.ICA;
			//find goals
			let goals = room.find(FIND_SOURCES);//find sources
			//add controller, if presentadd as goal
			if (typeof room.controller !== "undefined"){
				goals.push(room.controller);//find controller
			}
			
			//genarate maps
			let maps = [];
			for(let i in goals){
				let goal = goals[i];
				maps[i] = goal.pos.propagateDistances();
			}
			//create an empty map
			let map = Array(50).fill().map(a=>[])
			//combine maps
			for(let i in maps){
				for(let x in maps[i]){
					for(let y in maps[i][x]){ 
						if (typeof map[x][y] == "undefined"){
							map[x][y] = maps[i][x][y];
						} else {
							map[x][y] += maps[i][x][y];
						}
					}
				}
			}
			
			let objectMap=[];
			//reformat maps
			for(let x in map){
				for(let y in map[x]){
					if (map[x][y] !== null){
						objectMap.push({x:x,y:y,value:map[x][y]});
					}
				}
			}
			//sort maps
			objectMap = objectMap.sort(function(a, b) {
				return a.value -b.value;
			});
			//get rid of the 0s
			while (objectMap[0].value ==0){
				objectMap.shift();
			}
			//end map generation
			
			
			//create custom costmatrix
			let costMatrix = new PathFinder.CostMatrix;
			//create a variable to store the higher cost tiles in
			let expensive = [];
			//loop through all goals
			for (let i in goals){
				let x = goals[i].pos.x;
				let y = goals[i].pos.y;
				//add all surrounding tiles to the cost
				expensive.push(
					{x:x-1,y:y-1},
					{x:x,y:y-1},
					{x:x+1,y:y-1},
					{x:x-1,y:y},
					{x:x,y:y},
					{x:x+1,y:y},
					{x:x-1,y:y+1},
					{x:x,y:y+1},
					{x:x+1,y:y+1}
				);
			}
			//actuaally make the tiles more expensive
			for (let i in expensive){
				let tile = expensive[i];
				// dont want to overwrite walls
				if(room.isWall(tile.x, tile.y)==false){
					//avoid being near goals
					costMatrix.set(tile.x, tile.y, 10); 
				}
			}
			//serialize costmatrix for storage
			costMatrix = costMatrix.serialize();
			//end custom costmatrix
			
			//make goals in savable format
			for(let i in goals){
				goals[i] = goals[i].id;
			}
			//set ICA
			room.memory.ICA = {
				go:false,//this is to be semi manually changed to approve the build hub
				ready:false,//this is so see if weve found a valid place position
				map:objectMap,//array of points to plot roads to
				costMatrix: costMatrix,//costMatrix
				iterator: 0,//iterator
				goals:goals
			}
			//end ica populate
		} else if (room.memory.ICA.ready ==false){//begin search
			console.log("[ICA]finding valid placement locations");
			//decode ica
			let goals = [];
			for(let i in room.memory.ICA.goals){
				goals[i] = Game.getObjectById(room.memory.ICA.goals[i]);
			}
			let map = room.memory.ICA.map;
			let iterator = room.memory.ICA.iterator;
			
			//optional display
			for (let i in map){
				new RoomVisual(room.name).text(map[i].value, parseInt(map[i].x), parseInt(map[i].y)+0.175, {color:'green', font:.5});
			}
			//test sites
			if(plotBase(map[iterator].x, map[iterator].y, goals, room) == false){
				room.memory.ICA.iterator++;
			}
		} else {
			console.log("[ICA]found valid placement location");
			
			let buildSites = room.memory.ICA.buildSites;
					
			for(let i in buildSites){
				let tile=buildSites[i];
				if (tile.structure == "road"){
					//display biuldsites
					new RoomVisual(room.name).text("road", tile.x, tile.y+0.15, {color: 'blue', font: 0.45});
				} else {
					//display biuldsites
					new RoomVisual(room.name).text(tile.structure.substring(0, 5), tile.x, tile.y-0.15, {color: 'orange', font: 0.35});
				}
			}
			let locations = room.memory.ICA.locations;
			//optional display
			for (let j in locations){
				let tile = locations[j];
				new RoomVisual(room.name).text(tile.type, tile.x, tile.y+0.4, {color: 'yellow', font: 0.3});
			}
			
			//to confurm ICA we just store locations and buildsites at the room level and deleate ica and the ica flag
			if (room.memory.ICA.go){
				//save to memory
				room.memory.locations = locations;
				for(let i in room.memory.ICA.buildSites){
					let site = room.memory.ICA.buildSites[i];
					room.createBuildSite(site.x,site.y,site.structure);
				}
				console.log(room.name);
				Game.flags.ICA.remove();
				delete Memory.rooms[room.name].ICA;
				//this sets yp ERr to run
				room.memory.state = "ERr";
			}
		}
	}
};





