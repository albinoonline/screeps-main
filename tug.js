module.exports = {
	run:function(room){
		
		//see if room has a tug
		//if no tug set to empty string
		if (typeof room.memory.tug == "undefined"){
			room.memory.tug = "";
		}
		//if tug does not exist make a new one
		if (typeof Game.creeps[room.memory.tug] == "undefined"){
			let name = "tug"+room.name;
			Game.spawns[room.memory.spawn1].spawnCreep(["carry","move","move","move","move","move","move"],name, {memory: {role: "tug"}});
			room.memory.tug = name;
			//queue name "tug"+room.name this will be used when i get spawn queuing
		} else {
			//tug exists, do stuff
			let tug = Game.creeps[room.memory.tug];
			//need some kind of passive renewing this will often fail, due to not being near spawn
			if(tug.ticksToLive <500) {
				Game.spawns[room.memory.spawn1].renewCreep(tug);
			}//end gaining life
			
			//run tug queue stuff
			/*
			Queue is object with creeps name and an x and y
			*/
			//define queue
			if (typeof room.memory.moveQueue == "undefined"){
				room.memory.moveQueue = [];
			}
			//make a variable for easy access
			let Queue = room.memory.moveQueue
			
			
			if(Queue.length !==0){
				//queue present
				
				//if no creep or no quordanates
				if (typeof Game.creeps[Queue[0].creep]== "undefined" ||typeof Queue[0].x== "undefined"){
					room.memory.moveQueue.shift();
					return;
				}
				//create a rom position
				let pos = room.getPositionAt(Queue[0].x,Queue[0].y);
				
				
				let creep = Game.creeps[Queue[0].creep];
				//if creep is done spawning
				if (creep.spawning !== true){
					//if tug is at destination we need to switch places
					if (tug.pos.x == pos.x && tug.pos.y == pos.y && tug.pos.room == pos.room){
						//init pull
						tug.pull(creep);
						//tug to creep
						tug.moveTo(creep);
						//creeo to tug
						creep.move(tug);
					} else if (creep.pos.x == pos.x && creep.pos.y == pos.y && creep.pos.room == pos.room){//if it is at destination, we need to complete the move order.
						//simply remove the line from the queue
						room.memory.moveQueue.shift();
					} else {//creep needs to be moved
						//see if we can pull
						if (tug.pull(creep) == ERR_NOT_IN_RANGE){
							//we cant get closer
							tug.moveTo(creep,{visualizePathStyle:{stroke: 'yellow'}});
						} else {
							//we can initiate pull, move to destination
							tug.moveTo(pos,{visualizePathStyle:{stroke: 'yellow'}});
							//creep follow
							creep.move(tug);
						}
					}
					return;
				}//creep is not done spawning
			}
			//we will retrun if towing, so this doesn't go in either if
			//get hub info
			//grab extensions
			let hub = JSON.parse(JSON.stringify(room.memory.hub.extentions));
			//get hub objects
			for (let i in hub){
				hub [i]= Game.getObjectById(hub[i]);
			}
			//add spawn to hub
			hub.push(Game.spawns[room.memory.spawn1]);
			//filter out full items
			let filter=hub.filter(o => o.energyCapacity !== o.energy);
			//if we have energy
			if (tug.carry[RESOURCE_ENERGY] !== 0){
				if (filter.length !=0){
					//move to destination
					tug.moveTo(filter[0]);
					//give energy to destination
					tug.transfer(filter[0], RESOURCE_ENERGY);
				} else {//every things full of energy but we have some
					tug.moveTo(Game.getObjectById(room.memory.recycle.container));
					tug.transfer(Game.getObjectById(room.memory.recycle.container), RESOURCE_ENERGY);
				}
			} else {//we do not have energy
				//move to center
				tug.moveTo(Game.getObjectById(room.memory.recycle.container));
				//if we need energy
				if (filter.length !=0){
					//grab energy
					tug.withdraw(Game.getObjectById(room.memory.recycle.container), RESOURCE_ENERGY);
				}
			}
		}//tug exists
	}//run
};