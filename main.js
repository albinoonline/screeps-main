var ICA = require('InitialClaimAnalyser');
var ERr = require('ERr');
var NRr = require('NRr');
require('prototypes')();
require('buildsite')();
require('logistics')();
/*
TODO:
intra room tug transit
upgrade creeps only upgrade if more than 20% capacity in upgrade container, or ticks to downgrade is getting low
*/
module.exports.loop = function () {
	//have a timestamp for estimating cpu time
	var start = Date.now();
	
    //seems usefull, keep around
	//creep clear code from tutorial
    for(let name in Memory.creeps) {
        if(!Game.creeps[name]) {
            delete Memory.creeps[name];
            console.log('[memcheck] Clearing non-existing creep from memory: ', name);
        }
    }
	
	//Room based code
	for(i in Game.rooms){
		//get room object
		let room = Game.rooms[i];
		//try{
			room.build();//standerd room running code bor buildqueuing
		//}catch(task) {
		//	console.log(task);
		//}
		
		
		//if room state is defined check the state and run the appropriate code
		if( typeof room.memory.state != "undefined"){
			switch(room.memory.state){
				case "ERr": //early room run
					ERr.run(room);
				break;
				case "NRr": //normal room run
					NRr.run(room);
					if( typeof room.memory.logistics == "undefined" || Game.time%50 ==0) {
						room.logisticsUpdate();
					}
				break;
			}
		} else if (typeof room.controller != "undefined"){//if room is undefined but our controller is present
			//if this is our controller and we have no state, ICA should run
			if (room.controller.my){
				ICA.run(room);
			}
		}
	}
	
	//creep based code
	for(let i in Game.creeps){
		//get creep object 
		let creep = Game.creeps[i]; 
		if (typeof creep.memory.role == "undefined"){
			continue;
		}
		switch (creep.memory.role){
			case "worker":
				ERr.creep(creep);
			break;
			case "harvest":
				NRr.harvest(creep);
			break;
			case "upgrade":
				NRr.upgrade(creep);
			break;
			case "shortHaul":
				NRr.shortHaul(creep);
			break;
			case "construction":
				NRr.construction(creep);
			break;
			case "scout":
				if(typeof Game.flags["scout"] !== "undefined"){
					creep.moveTo(Game.flags["scout"],{visualizePathStyle:{stroke: 'yellow'}});
				}
			break;
			case "tug":
				//placeholder
			break;
			default:
				console.log("<span style='color:red; background:black;' >Creep "+i+" in room "+creep.room.name+" has unrecognized role.</span>");
			//break;
		}
	}
	
	//flag based code
	for (let flag in Game.flags){
		switch(flag) {
			case "ICA":
				ICA.run(Game.flags[flag].room);
				//this is an override for ica, forcing it to run, largely untested
			break;
			case "test":
				// code block
			break;
			default:
				// code block
		}
	}
	//time code, commented becouse of the log length slowing down tick speed issue
	let time = (Date.now() - start);
	
		new RoomVisual().text("[CPU]Last tick "+Game.time+" took "+ time +"ms.", 35, 2, {align:"left"});
	if(time > 20){
		//console.log("<span style='color:white; background:red;' >[CPU]</span> Game tick "+Game.time+" took "+ time +"ms.");
	} else if(time >= 15){
		//console.log("<span style='color:black; background:orange;' >[CPU]</span> Game tick "+Game.time+" took "+ time +"ms.");
	} else if(time >= 10){
		//console.log("<span style='color:black; background:yellow;' >[CPU]</span> Game tick "+Game.time+" took "+ time +"ms.");
	} else if(time > 5){
		//console.log("<span style='color:black; background:green;' >[CPU]</span> Game tick "+Game.time+" took "+ time +"ms.");
	} else {
		//console.log("<span style='color:black; background:#00cc00;' >[CPU]</span> Game tick "+Game.time+" took "+ time +"ms.");
	}
}