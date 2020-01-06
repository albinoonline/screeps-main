//emergency creep spawn 
//Game.spawns["Spawn1"].spawnCreep(["work","carry","move","carry","move"], Game.time, {memory: {role: "worker"}});
//Game.spawns["Spawn1"].spawnCreep(["move"], "scout", {memory: {role: "scout"}});

module.exports = {
	run:function(room){
		/*
		Goal of ERr is to setup the room, use basic "worker" units that do all tasks
		*/
		
		//wait flag
		if (typeof Game.flags["wait"+room.name] =="undefined"){
			//ensure flag exists
			console.log(room.createFlag(25,25,"wait"+room.name));
			Game.flags["wait"+room.name].memory.wait = 0;
		} else {
			//flag exists preform natural decay
			let flag = Game.flags["wait"+room.name];
			if (flag.memory.wait > 0){
				flag.memory.wait -=1;
			}
			//room visual for debug
			new RoomVisual('W1N1').text(flag.memory.wait, flag.pos);
		}
		
		//find main spawn, this should only ever need to run once per room
		if(typeof room.memory.spawn1 == "undefined"){
			for(let i in Game.spawns){
				if (Game.spawns[i].pos.roomName == room.name){
					room.memory.spawn1 = i;
				}
			}
		}
		//get flag
		let flag = Game.flags["wait"+room.name];
		//get spawn in a nice tidy variable
		let spawn = Game.spawns[room.memory.spawn1];
		//spawn lesser creeps
		//wait flag
		if (typeof flag !=="undefined"){
			//can/should we spawn a creep?
			if(room.energyCapacityAvailable > 250 && flag.memory.wait ==0){
				//get a name and set an empty var for parts
				let name = room.name+"worker"+Game.time;
				let parts = [];
				//determine parts
				if (room.energyCapacityAvailable <400){//if we don't have much energy, well add another work part than normal
					if (room.energyCapacityAvailable<350){
						parts = ["work","work","carry","move"];
					} else {
						parts = ["work","work","carry","move","move"];
					}
					
				} else {
					//variable worker creation
					let size = Math.floor(room.energyAvailable/200);
					parts =Array(3*size).fill("carry").fill("work",size).fill("move",size*2);
				}
				//spawn creep if succesfull add to wait, so we dont overproduce
				if (spawn.spawnCreep(parts, name, {memory: {role: "worker"}})==OK){
					flag.memory.wait += 150;
				}
			}
		}//end spawn
		
		//every 1000 ticks check if all sites have an associated container under location.id, if not see if the container is their, if all exists, and so do 5 extensions progress to NRr
		
		if (Game.time%1000==0){
			//create a flag variable to see if necessary items are done 
			let pass = true;
			for (i in room.memory.harvest){
				//see if container exists
				if (typeof room.memory.harvest[i].container == "undefined"){
					//try to find container
					let site = room.getPositionAt(room.memory.harvest[i].x, room.memory.harvest[i].y).lookFor(LOOK_STRUCTURES).filter(o => o.structureType== "container");
					if (site.length == 1){
						//container exists, save
						room.memory.harvest[i].container = site[0].id;
					} else {
						//container doesn't exist, progress to fail state
						pass = false;
					}
				}
			}
			//see if container exists
			if (typeof room.memory.upgrade.container == "undefined"){
				//try to find container
				let site = room.getPositionAt(room.memory.upgrade.x, room.memory.upgrade.y).lookFor(LOOK_STRUCTURES).filter(o => o.structureType== "container");
				if (site.length == 1){
					//container exists, save
					room.memory.upgrade.container = site[0].id;
				} else {
					//container doesn't exist, progress to fail state
					pass = false;
				}
			}
			//see if container exists
			if (typeof room.memory.recycle.container == "undefined"){
				//try to find container
				let site = room.getPositionAt(room.memory.recycle.x, room.memory.recycle.y).lookFor(LOOK_STRUCTURES).filter(o => o.structureType== "container");
				if (site.length == 1){
					//container exists, save
					room.memory.recycle.container = site[0].id;
				} else {
					//container doesn't exist, progress to fail state
					pass = false;
				}
			}
			//see if extentions exist
			if (typeof room.memory.hub.extentions == "undefined"){
				//try to find extentions
				let extentions = room.find(FIND_MY_STRUCTURES, {filter: function(o) {return (o.structureType == STRUCTURE_EXTENSION);} });
				if (extentions.length == 5) {
					//they exist, save
					room.memory.hub.extentions=[];
					for (let i in extentions){
						room.memory.hub.extentions[i] = extentions[i].id;
					} 
				}else {
					//doesn't exist, progress to fail state
					pass = false;
				}
			}
			if (pass){
				//room.memory.state = "NRr";
				console.log("<span style='color:black; background:#66ff66;' >[ERr]</span>Game tick "+Game.time+"; "+room.name+" Passed NRr check");
				room.memory.state ="NRr";
				
			} else {
				//we've failed :(
				console.log("<span style='color:black; background:yellow;' >[ERr]</span>Game tick "+Game.time+"; "+room.name+" Failed NRr check");
			}
		}
	},
	creep:function(creep){
		/*
		
		ERR will create basic creeps, if these creeps have no location to harvest from they will place a “waiting(roomname)” flag down (if none exists already) and increment a wait counter by 2 every tick, this will decay in the base ERR code by one every tick, and worker will only be made if this flag isn't present or is zero
		flag wont go below 0 and will increment by 50 when a new worker is spawned.
		ERR basic creeps, once equipped with energy, will attempt to do the following in this order:
		save downgrade
		fill the spawn and any extensions
		Build the recycle container
		fill recycle container

		
		*/
		//get some vars
		let room = creep.room;
		let spawn = Game.spawns[room.memory.spawn1];
		//simple harvest logic
		if (creep.carry[RESOURCE_ENERGY] == 0 && creep.memory.action != "gather"){
			creep.memory.action = "gather";
		}
		//simple chose stuff logic
		if (creep.carry[RESOURCE_ENERGY] == creep.carryCapacity && creep.memory.action == "gather"){
			if (room.controller.ticksToDowngrade < 5000){//save controller
				creep.memory.action = "upgrade";
				creep.say("upgrade");
			} else if (room.energyCapacityAvailable !== room.energyAvailable){//fill energy
				creep.memory.action = "deliver";
				creep.say("deliver");
			} else if (room.controller.level == 1){//get RCL 2
				creep.memory.action = "upgrade";
				creep.say("upgrade");
			} else if (typeof room.memory.recycle.container == "undefined"){//is recycle done?
				creep.memory.action = "recycle";
				creep.say("recycle");
			} else if (Game.getObjectById(creep.room.memory.recycle.container).store.getFreeCapacity(RESOURCE_ENERGY) > 0){//fill recycle container unless full
				creep.memory.action = "fill";
				creep.say("fill");
			} else {//build stuff by lurking around memory
				creep.memory.action = "work";
			}
		}
		
		
		//creep.say(creep.memory.action);
		
		///switch doing one of the actions
		let target = Game.getObjectById(creep.memory.target);
		switch(creep.memory.action) {
			case "gather":
				//find closes source if none pre assighned
				if(typeof creep.memory.source == "undefined"){
					//re target
					let source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
					if (source == null){
						//add 2 to flag
						Game.flags["wait"+room.name].memory.wait += 200;
					} else {
						//move to other
						creep.memory.source = source.id;
						creep.moveTo(source,{visualizePathStyle:{stroke: 'yellow'}});
					}
				}
				let source = Game.getObjectById(creep.memory.source);
				let move = creep.moveTo(source,{visualizePathStyle:{stroke: 'yellow'}});
				//if move failed
				if(move == ERR_NO_PATH){
					//re target
					source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
					if (source == null){
						//add 2 to flag
						Game.flags["wait"+room.name].memory.wait += 10;
					} else {
						//move to other
						creep.memory.source = source.id;
						creep.moveTo(source,{visualizePathStyle:{stroke: 'yellow'}});
					}
				}
				creep.harvest(source);
			break;
			case "deliver":
				//if we can no longer deliver, if we are full this will force re target next tick
				if (room.energyCapacityAvailable == room.energyAvailable){
					creep.memory.action = "gather";
				}
				creep.moveTo(target,{visualizePathStyle:{stroke: 'red'}});
				let transfer = creep.transfer(target, RESOURCE_ENERGY);
				if (transfer !== OK || transfer !== ERR_NOT_IN_RANGE){
					//need to reallocate energy to other containers
					let stuff = room.find(FIND_MY_STRUCTURES, {filter: function(o) {return (o.structureType == STRUCTURE_EXTENSION || o.structureType == STRUCTURE_SPAWN) && (o.energyCapacity !== o.energy);} });
					if (stuff.length != 0){
						creep.memory.target = stuff[0].id;
					}
				}
			break;
			case "upgrade":
				//move and upgrade controller
				creep.moveTo(room.controller,{visualizePathStyle:{stroke: 'green'}})
				creep.upgradeController(room.controller);
			break;
			case "recycle":
				//is it a construction site?
				let pos = room.getPositionAt(creep.room.memory.recycle.x, creep.room.memory.recycle.y);
				let bu = creep.build(target);
				if (bu == OK || bu == ERR_NOT_IN_RANGE){
					//yes build it
					creep.moveTo(target);
					creep.build(target);
				} else {//its not a construction site, find the recycle construction site
					let look = creep.room.lookForAt(LOOK_CONSTRUCTION_SITES, pos);
					creep.say(look);
					//did we find it?
					if (look.length !=0){
						creep.memory.target = look[0].id
					} else {//we didn't is it done?
						look = creep.room.lookForAt(LOOK_STRUCTURES, pos).find(o => o.structureType == "container");
						//try to find if its done
						if (typeof look =="undefined"){
							//it doesnt exist
							pos.createConstructionSite("container");
						} else {
							//it does exist,
							//log so i can check 
							
							creep.room.memory.recycle.container = look.id
							creep.memory.action = "gather";
						}
					}
					
				}
			break;
			case "fill":
				//fills the center container if its not full
				let bin = Game.getObjectById(creep.room.memory.recycle.container);
				if (bin.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
					creep.moveTo(bin);
					creep.transfer(bin, RESOURCE_ENERGY);
				} else {
					creep.memory.action = "upgrade";
				}
				
			break;
			case "work":
				//we'll be poking around in buildcode that may not be initalized, so we are going to try catch
				try{
					let active = creep.room.memory.build.active[0];
					let work = Game.getObjectById(active.id);
					creep.moveTo(work);
					if (active.type="build"){
						creep.build(work)
					} else if (active.type="fix"){
						creep.repair(work)
					} else {
						creep.memory.action = "upgrade";
					}
				}catch(oof) {
					creep.memory.action = "upgrade";
					creep.say("oOf");
					console.log(oof);
				}
				
			break;
			default:
				creep.memory.action = "upgrade";
			break;
		}
	}
};

