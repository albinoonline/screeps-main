var ICA = require('InitialClaimAnalyser');
var buildsite = require('buildsite');
var ERr = require('ERr');
require('prototypes')();
/*
TODO:

*/
module.exports.loop = function () {
	var start = Date.now();
    //seems usefull, keep around
    for(let name in Memory.creeps) {
        if(!Game.creeps[name]) {
            delete Memory.creeps[name];
            console.log('[memcheck] Clearing non-existing creep from memory: ', name);
        }
    }
	//end cleanup code
	
	//Room based code
	for(i in Game.rooms){
		let room = Game.rooms[i];
		buildsite.run(room);
		if(room.memory.state == "ERr"){
			ERr.run(room);
		}
	}
	
	
	//flag based code
	for (let flag in Game.flags){
		switch(flag) {
			case "ICA":
				ICA.run(Game.flags[flag].room);
			break;
			case "test":
			
			
			
			break;
			default:
				// code block
		}
	}
	//room based code
	
	console.log("time: "+(Date.now() - start));
}