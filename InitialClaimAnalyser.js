
/*
//functions 
*/
function  plotBase(x,y, goals, room, cost, hub, containers = false){
	/*
	x and y is the position
	goals are the end positions for the connecting roads
	room is the current room
	cost is the costMatrix for pathfinding
	hub is base layout
	containers is whether to spawn containers at the end of the roads
	
	should make this take a roomPos in future
	*/
	let tag ='[BasePlot 0.1]';
	
	//returns false if base plot failed
	//returns x,y, and structures in an array called go if base plot can be successful, saving values in memory
	
	//grrr strings
	x=parseInt(x);
	y=parseInt(y);
	
	//this stops checking tiles near the borders
	if (!(x < 49 && x > 0 && y < 49 && y > 0)){
		return false;
	}
	let terrain = room.getTerrain();
	//make sure no placement locations are walls
	for (i in hub){
		if (room.getTerrain().get(hub[i].x,hub[i].y) == 1){
			return false;
		}
	}
	//make sure goals aren't too close
	if (room.getPositionAt(x,y).findInRange(goals,3).length !=0){
		return false;
	}
	//at this point the location is valid, so we'll start pre plotting the room
	
	//need to make the positoins that would be structures inpassable
	//look through hub
	for (i in hub){
		let structure = hub[i];
		//i think only road and container structures are walkable, so checking not is faster than checking for everything else
		if (structure.structure != 'road' || structure.structure != 'container'){
			//set inpassable
			cost.set(structure.x, structure.y, 255);
		}
	}
	//end pathing cost matrix
	
	//create hub roomPos for road destination plotting.
	let hubGoal = room.getPositionAt(x,y);
	//paths will hold all the path buildings
	let paths = [];
	
	//plan roads
	for(let i in goals){
		let goal = goals[i];
		
		//create path
		let path = PathFinder.search(goal.pos, hubGoal, {
			swampCost:1,//we care not for terrain type
			plainCost:1,
			roomCallback: function() {
				//use custom costmatrix
				return cost;
			}
		}).path;
		
		//reformat roads and give them structure type
		for(let i in path){
			path[i] = {x:path[i].x, y:path[i].y, structure:STRUCTURE_ROAD};
		}
		//add destination container (for upgrade and harvest sites)
		path.push({x:path[0].x, y:path[0].y, structure:STRUCTURE_CONTAINER});
		//add paths together
		paths = paths.concat(path);
	}//end path generation
	
	//hub is the hub buildings
	//all the structures in one variable
	let buildSites = hub.concat(paths);
	
	console.log(tag+'location found, X: '+x+' Y: '+y);
	return {
		x:x,
		y:y,
		structures:buildSites
	}
}//end function
function sitePlan(x,y){
	//grrr strings
	x=parseInt(x);
	y=parseInt(y);
	//this is the site we plan on making, at some point i may make this read from memory, or if its possible, github
	return [
	{x:x+1, y:y+1, structure:'spawn'},
	{x:x,y:y, structure:'container'},
	{x:x+1, y:y-1, structure:'extension'},
	{x:x, y:y-2, structure:'extension'},
	{x:x-1, y:y-1, structure:'extension'},
	{x:x-1, y:y+1, structure:'extension'},
	{x:x, y:y+2, structure:'extension'},
	{x:x-1, y:y+2, structure:'road'},
	{x:x-2, y:y+1, structure:'road'},
	{x:x-1, y:y, structure:'road'},
	{x:x, y:y+1, structure:'road'},
	{x:x+1, y:y, structure:'road'},
	{x:x+1, y:y+2, structure:'road'},
	{x:x+2, y:y-1, structure:'road'},
	{x:x+1, y:y-2, structure:'road'},
	{x:x, y:y-1, structure:'road'},
	{x:x-1, y:y-2, structure:'road'},
	{x:x-2, y:y-1, structure:'road'},
	{x:x+2, y:y+1, structure:'road'}
	];
}

module.exports = {
	run:function(room){
		//ICA stands for initial claim analyzer.
		let tag = '[ICA 1.1]';
		
		//we need to check if we have enough bucket to run ICA, which seems to take ~200 milliseconds regardless of how crowded the room is, so waiting for 300 should be sufficient, if we don have enough time, we remove the room from game objects, in hope that other systems that depend on ICA running don't start
		if (Game.cpu.bucket < 300){
			console.log(tag+"not enough CPU");
			return;
		} else {
			console.log(tag+"Init" + room.name);
		}
		
		//find goals
		//find sources, save as goals
		let goals = room.find(FIND_SOURCES);
		//add controller, if present as a goal
		if (typeof room.controller !== "undefined"){
			goals.push(room.controller);
		}
		//end find goals
		
		///might make a miltipoint heatmap function, since this will be used with the second hub aswell
		//create map
		//create an empty map, to hold the combined maps
		let map = Array(50).fill().map(a=>[]);
		//iterate through goals
		for(let i in goals){
			//generate individual goal distance propagation heat maps
			let goalmap = goals[i].pos.propagateDistances();//i love this function so much
			//combine maps
			for(let x in goalmap){
				for(let y in goalmap[x]){
					//since we cant add to undefined
					if (typeof map[x][y] == "undefined"){
						map[x][y] = goalmap[x][y];
					} else {//since we can add to the previus value
						map[x][y] += goalmap[x][y];
					}//end ass if
				}//end y loop
			}//end x loop
		}//end goal loop
		
		//reformat map
		let objectMap=[];
		for(let x in map){
			for(let y in map[x]){
				if (map[x][y] !== null){
					objectMap.push({x:x,y:y,value:map[x][y]});
				}//end if
			}//end y loop
		}//end x loop
		
		//sort map
		objectMap = objectMap.sort(function(a, b) {
			return a.value -b.value;
		});
		//end map generation
		///end what may be cut
		
		//create custom cost matrix
		let costMatrix = new PathFinder.CostMatrix;
		//create a variable to store the higher cost tiles in
		let expensive = [];
		//loop through all goals
		for (let i in goals){
			let x = goals[i].pos.x;
			let y = goals[i].pos.y;
			//add all surrounding tiles to the cost, this will prioritize routing around these areas, since creeps will be sitting here often
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
		//actually make the tiles more expensive to avoid being near goals
		let terrain = room.getTerrain();
		for (let i in expensive){
			let tile = expensive[i];
			//dont want to overwrite walls
			if(terrain.get(tile.x,tile.y) != 1  ==false){
				//making the tiles more expensive
				costMatrix.set(tile.x, tile.y, 10); 
			}
		}
		
		
		//display
		for (let i in objectMap){
			new RoomVisual(room.name).text(objectMap[i].value, parseInt(objectMap[i].x), parseInt(objectMap[i].y)+0.175, {color:'green', font:.5});
		}
		//test sites
		//set some variables
		let iterator = 0;
		let go = false
		//iterate untill we ger a non false result
		while (go == false){
			go = plotBase(objectMap[iterator].x, objectMap[iterator].y, goals, room, costMatrix, sitePlan(objectMap[iterator].x,objectMap[iterator].y), true)
			iterator++			
		}
		//when we exit the while loop, go will be populated with the results of the base plot.
		let x = go.x;
		let y = go.y;
		let buildSites = go.structures;
		//start dumping shit into memory
		
		//give a terrain matrix
		let terrainMatrix = [];
		for(let x = 0; x < 50; x++){
			terrainMatrix[x] = [];
			for(let y = 0; y < 50; y++){
				terrainMatrix[x][y] = terrain.get(x,y);
			}
		}
		room.memory.terrainMatrix = terrainMatrix;
		
		room.memory.hub = {x:x,y:y};
		room.memory.harvest = [];
		for(let i in buildSites){
			let tile=buildSites[i];
			let x = tile.x;
			let y = tile.y;
			//buildSites are my own replacement for construction sites
			room.createBuildSite(x,y,tile.structure);
			//ive got specal 'sites' they my concept relies on, they are on containers
			if (tile.structure == STRUCTURE_CONTAINER){
				//generate harvest, upgrade and recycle sites
				let roomPos = room.getPositionAt(x, y);
				if (roomPos.findInRange(FIND_SOURCES, 1).length ==1){
					//site is harvest
					//save to memory
					room.memory.harvest.push({x:x,y:y, source:room.getPositionAt(x,y).findClosestByRange(FIND_SOURCES).id});
				
				} else if (roomPos.getRangeTo(room.controller)==1) {
					//site is upgrade
					//find adjacent tiles
					let adjacent = [{x:x,  y:y-1},{x:x,  y:y+1},
						{x:x+1,y:y},{x:x+1,y:y-1},{x:x+1,y:y+1},
						{x:x-1,y:y},{x:x-1,y:y-1},{x:x-1,y:y+1}
					];
					//make sure the tiles are not roads or structures
					let upsite = [];
					//get terrain
					for(let j in adjacent){
						let site = adjacent[j];
						//actual wall and building checking
						if (terrain.get(site.x,site.y) != 1 && buildSites.filter(o => o.x == site.x && o.y == site.y).length == 0){
							//were good att it
							upsite.push({x:site.x,y:site.y});
							//add road 
							room.createBuildSite(site.x,site.y, STRUCTURE_ROAD);
						}
					}
					//save to memory
					room.memory.upgrade={x:x, y:y, sites: upsite};
					
					//display location
				} else {
					//save to memory
					room.memory.recycle=({x:tile.x, y:tile.y});
				}
			} //end if
		} //end loop
		//this sets yp ERr to run
		room.memory.state = "ERr";
		
	} //end run
};