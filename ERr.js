module.exports = {
	run:function(room){
		/*
		Goal of ERr is to setup the room, use basic "worker" units that do all tasks
		
		Remember, if job is build and id is not a valid game object, first check for construction sites and if there are none make one then check agein (unless creating one returns the id)
		*/
		
		
		//find creeps
		let creeps = [];
		for(let i in Game.creeps){
			if (Game.creeps[i].pos.roomName == room.name && Game.creeps[i].memory.role=="worker"){
				creeps.push(Game.creeps[i]);
			}
		}
		//find main spawn, this should only ever need to run once per room
		if(typeof room.memory.spawn1 == "undefined"){
			for(let i in Game.spawns){
				if (Game.spawns[i].pos.roomName == room.name){
					room.memory.spawn1 = i;
				}
			}
		}
		//find sources
		if(typeof room.memory.sources == "undefined"){
			let sources = room.find(FIND_SOURCES);
			room.memory.sources =[];
			for (let i in sources){
				room.memory.sources.push(sources[i].id);
			}
		}
		let spawn = Game.spawns[room.memory.spawn1];
		spawn.spawnCreep(["work","carry","move","carry","move"], Game.time, {memory: {role: "worker"}});
		
		
		for(let i in creeps){
			let creep = creeps [i];
			//creep.carry[RESOURCE_ENERGY]
			//creep.carryCapacity
			if (creep.carry[RESOURCE_ENERGY] == 0 && creep.memory.action != "gather"){
				creep.memory.action = "gather";
				creep.memory.target = room.memory.sources[Math.floor(Math.random()*(room.memory.sources.length))];
			}
			if (creep.carry[RESOURCE_ENERGY] == creep.carryCapacity && creep.memory.action == "gather"){
				if (room.controller.ticksToDowngrade < 5000){
					creep.memory.action = "upgrade";
					creep.memory.target = room.controller.id; 
				} else if (creeps.length <5){
					creep.memory.action = "deliver";
					creep.memory.target = spawn.id;
				} else if (room.controller.level == 1){
					creep.memory.action = "upgrade";
					creep.memory.target = room.controller.id;
				} else {
					if (Game.time%2==0 && creeps.length <20){
						creep.memory.action = "build";
						//pull an item from the biuld queue
						let goal = room.memory.buildQueue.shift();
						//it should be noted that the structure type is stored in id, for... reasons
						room.getPositionAt(goal.x, goal.y).createConstructionSite(goal.id);
						//now we need to find the site, because the previous function does not return it.
						let test = room.getPositionAt(goal.x, goal.y).lookFor(LOOK_CONSTRUCTION_SITES);
						//store it in memory
						creep.memory.target = test[0].id;
					} else {
						creep.memory.action = "deliver";
						creep.memory.target = spawn.id;
					}
				}
			}
			creep.say(creep.memory.action);
			let target = Game.getObjectById(creep.memory.target);
			if(creep.pos.getRangeTo(target) != 1){
				//move select new target if stuck
				if (creep.moveTo(target,{visualizePathStyle:{}}) == ERR_NO_PATH && creep.memory.action == "gather"){
					creep.memory.target = room.memory.sources[Math.floor(Math.random()*(room.memory.sources.length))];
				}
			} else {
				//switch doing one of the actions
				switch(creep.memory.action) {
					case "gather":
						creep.harvest(target);
					break;
					case "deliver":
						if (creep.transfer(target, RESOURCE_ENERGY) == ERR_FULL){
							//need to reallocate energy to other containers
							//creep.memory.target = ;
						}
					case "upgrade":
						creep.upgradeController(target);
					case "build":
						if (creep.build(target) == ERR_INVALID_TARGET){
							creep.memory.action = "gather";
						}
					break;
					default:
						// code block
					//break;
				}
			}
		}
	}
};

