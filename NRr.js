
var tug = require('tug');
module.exports = {
	/*
	short haul and construction need overhaul
	
	*/
	
	run:function(room){
		tug.run(room);
		if (typeof Game.creeps[room.memory.tug] == "undefined"){
			return;
		}
		//see if harvest have necessary creeps
		let harvest = room.memory.harvest;
		for (let i in harvest){
			let harvestSite = harvest[i];
			if (typeof location.creep == "undefined"){
				harvestSite.creep = "";
			}
			//create a harvest creep if none present, but not if tug is not present
			if (typeof Game.creeps[harvestSite.creep] == "undefined" && typeof Game.creeps[room.memory.tug] !== "undefined"){
				let name = "harvest"+room.name+"source"+i;
				Game.spawns[room.memory.spawn1].spawnCreep(["work","work","work","work","work"],name, {memory: {role: "harvest", source: harvestSite.source,target:{x:harvestSite.x, y:harvestSite.y}}});
				harvestSite.creep = name;
				//queue name "harvest"+room.name+"source"+i this will be used when i get spawn queuing
				
			}
		}//end for
		
		//upgrade creeps 
		let upgradeSites = room.memory.upgrade.sites;
		for (let i in upgradeSites){
			let upgradeSite = upgradeSites[i];
			//harvest location
			if (typeof upgradeSite.creep == "undefined"){
				upgradeSite.creep = "";
			}
			//upgrade container
			let upgradeContainer = Game.getObjectById(room.memory.upgrade.container);
			//change value to percent filled
			upgradeContainer = upgradeContainer.store[RESOURCE_ENERGY]/upgradeContainer.storeCapacity;
			//see if creep is defined
			let defined = typeof Game.creeps[upgradeSite.creep] !== "undefined";
			//see if tug is defined 
			let tug = typeof Game.creeps[room.memory.tug] !== "undefined";
			//create a Upgrade if none present, but only if the tug is present, and not if the energy supply is to low
			if (defined == false && tug == true && upgradeContainer > 0.5){
				let name = "upgrade"+room.name+"site"+i;
				Game.spawns[room.memory.spawn1].spawnCreep(["carry","work","work","work","work","work"],name, {memory: {role: "upgrade",target:{x:upgradeSite.x, y:upgradeSite.y}}});
				upgradeSite.creep = name;
				//queue name "upgrade"+room.name+"site"+i this will be used when i get spawn queuing
				
			}
			
		}//end for 
		
		//create room logistics
		//lookup how many shortHaoulers we have
		let creeps = 0;
		for(let i in Game.creeps){
			if (Game.creeps[i].pos.roomName == room.name && Game.creeps[i].memory.role=="shortHaul"){
				creeps++;
			}
		}
		if (creeps < 2){
			Game.spawns[room.memory.spawn1].spawnCreep(["carry","move","carry","move","carry","move","carry","move","carry","move"],room.name+"shortHaul"+Game.time, {memory: {role: "shortHaul", deliver: true}});
		}
		
		
		//create room construction
		//lookup how many construction we have
		let construction = [];
		for(let i in Game.creeps){
			if (Game.creeps[i].pos.roomName == room.name && Game.creeps[i].memory.role=="construction"){
				construction.push(Game.creeps[i]);
			}
		}
		if (construction.length == 0){
			Game.spawns[room.memory.spawn1].spawnCreep(["work","work","carry","carry","carry","carry","carry"],room.name+"construction"+Game.time, {memory: {role: "construction", action: ""}});
		}
		
		
	},
	harvest:function(creep){
		//once low health move to be restored
		if(creep.ticksToLive < 100) {
			let spawn = Game.spawns[creep.room.memory.spawn1]
			creep.room.moveOrder(creep.name, spawn.x, spawn.y);
		}
		let source = Game.getObjectById(creep.memory.source);
		//harvest 
		if (creep.harvest(source) == ERR_NOT_IN_RANGE || creep.ticksToLive > 1490){	
			//once spawned/ fully healed move to destination
			if(creep.ticksToLive > 1450) {
				creep.room.moveOrder(creep.name, creep.memory.target.x, creep.memory.target.y);
			}
			//harvest failed, assume we are at spawn and try to gain life
			Game.spawns[creep.room.memory.spawn1].renewCreep(creep);
		}
	},//end harvest
	upgrade:function(creep){
		//once low health move to be restored, later i will need to add another condition to this if to allow dynamic upgraders
		if(creep.ticksToLive < 100) {
			let spawn = Game.spawns[creep.room.memory.spawn1]
			creep.room.moveOrder(creep.name, spawn.x, spawn.y);
		}
		//container
		let upgradeContainer = Game.getObjectById(creep.room.memory.upgrade.container);
		//upgrade
		let upgrade = "";
		//if room controller i at risk or energy is high try to upgrade
		if (creep.room.controller.ticksToDowngrade < 1500 || upgradeContainer.store[RESOURCE_ENERGY]/upgradeContainer.storeCapacity > 0.25) {
			upgrade =creep.upgradeController(creep.room.controller);
		}
		if (upgrade == ERR_NOT_IN_RANGE || creep.ticksToLive > 1490){
			//upgrade failed, assume we are at spawn and try to gain life
			Game.spawns[creep.room.memory.spawn1].renewCreep(creep);
			//once spawned/ fully healed move to destination
			if(creep.ticksToLive > 1450) {
				creep.room.moveOrder(creep.name, creep.memory.target.x, creep.memory.target.y);
			}
		}
		if (upgrade == ERR_NOT_ENOUGH_RESOURCES){
			creep.withdraw(upgradeContainer, RESOURCE_ENERGY);
		}
	},//end upgrade
	shortHaul:function(creep){
		//shortHaul
		let logistics=creep.room.memory.logistics;
		
		let target = Game.getObjectById(creep.memory.target);
		
		//if true try to drop off, else get more power
		if (creep.memory.deliver){
			// need power
			//attempt withdrawal save error in value
			let take = creep.withdraw(target, RESOURCE_ENERGY);
			//conditions we consider sucessfull, needing change in target and action
			if (take == OK || take == ERR_FULL || take == ERR_NOT_ENOUGH_RESOURCES){
				//change target
				creep.memory.target = creep.room.memory.logistics.dropOff[0];
				//change action
				creep.memory.deliver = false;
			}else if (take == ERR_NOT_IN_RANGE ){
				//if to far move closer
				creep.moveTo(target);
			} else if (take == ERR_INVALID_TARGET ){
				//if invalid target reassign
				creep.memory.target = creep.room.memory.logistics.pickup[0];
			} else {
				//if other error report using creep.say
				creep.say(take);
			}
		} else {
			// need dropoff
			//attempt transfer save error in value
			let give = creep.transfer(target, RESOURCE_ENERGY);
			//conditions we consider sucessfull, needing change in target and action
			if (give == OK || give == ERR_FULL || give == ERR_NOT_ENOUGH_RESOURCES){
				//change target
				creep.memory.target = creep.room.memory.logistics.pickup[0];
				//change action
				creep.memory.deliver = true;
			} else if (give == ERR_NOT_IN_RANGE ){
				//if to far move closer
				creep.moveTo(target);
			} else if (give == ERR_INVALID_TARGET ){
				//if invalid target reassign
				creep.memory.target = creep.room.memory.logistics.dropOff[0];
			} else {
				//if other error report using creep.say
				creep.say(give);
			}
		}
	},//end shortHaul
	construction:function(creep){
		//no longer coded on as creep basis
	}//end construction
};