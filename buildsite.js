
//functions
function generateQueue(room){
	//make sure buildsites exist
	if (typeof room.memory.buildSites == "undefined"){
		//make an empty 3d array
		room.memory.buildSites = Array(50).fill().map(a=>Array(50).fill().map(b=>[]));
	}
	//create an array we can delete from 
	let sites = JSON.parse(JSON.stringify(room.memory.buildSites));
	//create and empty array to hold items for deconstruction
	let deconstruction=[];
	//this will be the structures we still need to place
	let construction=[];
	
	//find already placed structures
	let buildings = room.find(FIND_STRUCTURES);
	for(let i in buildings){
		let building = buildings[i];
		//if the fownd biulding is in the buiildsites array
		let arrayPos = sites[building.pos.x][building.pos.y].indexOf(building.structureType);
		if(arrayPos ==-1){
			//disclude keeper and controllers
			if (building.structureType != "keeperLair" && building.structureType != "controller"){				
				//the structure does not exist in sites, and needs to be queued for deconstruction
				deconstruction.push({
					x:building.pos.x,
					y:building.pos.y,
					job:"dismantle",
					id:building.id
				});
			}
		} else {
			// the structure exists in sites, we'll remove it so the only remaining sites are the ones needing construction
			sites[building.pos.x][building.pos.y].splice(arrayPos, 1);
		}
	}
	//fill  construction
	for(let x in sites){
		for(let y in sites[x]){
			for(let i in sites[x][y]){
				construction.push({
					x:x,
					y:y,
					job:"build",
					id:sites[x][y][i]
				});
				//display
				let tile=sites[x][y][i];
				if (tile == "road"){
					//display biuldsites
					new RoomVisual(room.name).text("road", parseInt(x), parseFloat(y)+0.15, {color: 'blue', font: 0.45});
				} else {
					//display biuldsites
					new RoomVisual(room.name).text(tile.substring(0, 5), parseInt(x), parseFloat(y)-0.15, {color: 'orange', font: 0.35});
				}
			}
		}
	}
	//need to do upkeep stuff here, grab any underhealth structures that arent walls or ramparts
	let damaged = room.find(FIND_MY_STRUCTURES, {
		filter: function(o) { return (o.structureType !== STRUCTURE_WALL) && (o.hitsMax !== STRUCTURE_RAMPART) && (o.hits !== o.hitsMax)}
	});
	//make an array for items needing repair
	let fix=[];
	for(let i in damaged){
		fix.push({
			x:damaged[i].pos.x,
			y:damaged[i].pos.y,
			job:"fix",
			id:damaged[i].id
		});
	}
	//make sure the queue exists in memory
	if (typeof room.memory.buildQueue == "undefined"){
		//make an empty 3d array
		room.memory.buildQueue=[];
	}
	
	//here we actually need to setup a queue
	//if weve got nothing to do put a wait in the queue
	if (construction.length + deconstruction.length + fix.length ==0){
		
		return [{x:0,y:0,type:"wait",id:100}];
	}
	//at this point jobs are properly formatted and stored in construction deconstruction and fix arrays
	
	//put the arrays together and limit it to the first 10
	return fix.concat(deconstruction, construction).slice(0, 10);
}
/*
need the actual build code to do construction site placing

queue format:
array of objects
{
	x:x,
	y:y,
	job:"fix", "dismantle", "wait", or "build",
	id:id of the object or the structure type of job is build, or the wait counter if job is wait
}

*/

module.exports = {
	run:function(room){
		//console.log(room.memory.buildQueue.length);
		if (room.memory.buildQueue.length == 0){
			room.memory.buildQueue = generateQueue(room);
		}
		
		/*
		optional display
		not currently set up
		
		let tile=buildSites[i];
		if (tile.structure == "road"){
			//display biuldsites
			new RoomVisual(room.name).text("road", tile.x, tile.y+0.15, {color: 'blue', font: 0.45});
		} else {
			//display biuldsites
			new RoomVisual(room.name).text(tile.structure.substring(0, 5), tile.x, tile.y-0.15, {color: 'orange', font: 0.35});
		}
		*/
	}
};





