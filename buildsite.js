module.exports = function(){
	//general running code 
	Room.prototype.build = function(){
		let tag = "[Bld 0.1]";
		//get room object
		let room = this;
		//make sure we should run
		if( typeof room.memory.state != "undefined"){
			if (room.memory.state == "ERr" || room.memory.state == "NRr") {
				//we should run
				
				//make sure build array exists
				if (typeof this.memory.build == "undefined"){
					room.generateQueues();//will populate queues
				} else if (Game.time%300==0){//updates passively every 3000 ticks
					room.generateQueues();
				}//end update queue
				//build start code
				
				if (this.memory.build.active.length == 0){ //if active working sites are zero make one
					if (!room.setActive()){
						return;
					}
				}// fetching an active site
				
				///if dismantle exists we'll spawn a purpose creep to dismantle it, then kill itself, due to distance and logistics issues
				
				//dismantle code will go here
				
				//construction running code
				room.runActive();
			}//run
		}//if
	}//prototype
	
	Room.prototype.runActive=function(workerLimit = 2){//new 
		//this function will look at all the active situations, and handle the creeps
		let tag = "[RuA 1.0]";
		//we've got a new array we want called idle, its where construction creeps go to wait
		if (typeof this.memory.build.idle== "undefined"){
			this.memory.build.idle = [];
		}
		for (let i in this.memory.build.active){
			//site shortcut
			let task = this.memory.build.active[i];
			let object = Game.getObjectById(task.id);
			//make sure object is not null
			if (object ==null){
				//remove from array
				this.memory.build.active.splice(i, 1);
				//make sure to start here agein
				i -=1;
				console.log(tag+"invalid object in active array, set active returned: "+this.setActive());
				continue;
			}
			//debug
			new RoomVisual(this.name).text(task.job +" "+object.structureType, 35, 3+parseInt(i), {align:"left"});
			new RoomVisual(this.name).line(35, 3+parseInt(i), object.pos.x, object.pos.y);
			
			//ensure creep exists
			if (Game.creeps[task.creep] == null){
				//no creep find one
				if (this.memory.build.idle.length !=0){
					//if one is idle use it
					this.memory.build.active[i].creep = this.memory.build.idle.shift();
				} else if (this.energyAvailable >= 150 && typeof Game.creeps[this.memory.tug] != "undefined" && workerLimit <= 2){//we cant make a creep for less than 150, and there is no use if there is no tug
					//make creep
					//potential name
					let name = this.name+"construction"+Game.time;
					//figure out how big to make our construction creep
					let size = Math.floor(this.energyAvailable/150);
					let parts =Array(2*size).fill("carry").fill("work",size);
					let spawn = Game.spawns[this.memory.spawn1].spawnCreep(parts, name, {memory: {role: "construction"}});
					if (spawn == OK){
						this.memory.build.active[i].creep = name;
					} else {
						console.log("test");
						//we failed
						if (spawn != -4){//i dont care about busy errors
							console.log(tag+"Error "+spawn+" spawn creep failed");
						}
						continue;//we need to gtfu or errors may occur
					}
				} else {//not enough energyAvailable or tug not defined, or worker limit reached
					continue;//we need to gtfu or errors may occur
				}
			}//creep exists
			//get creep
			let creep = Game.creeps[this.memory.build.active[i].creep];
			//error catching
			if (typeof creep =="undefined"){
				console.log(tag+"unefined creep");
				continue
			}
			//var to hold errors
			let attempt ="idle";
			
			let target = Game.getObjectById(task.id);
			//check if valid target
			if (target == null ){
				//no target
				creep.say("job done");
				//remove from array
				this.memory.build.active.splice(i, 1);
				//make sure to start here agein
				i -=1;
				//move creep to idle
				this.memory.build.idle.push(creep.name);
			} else if (task.job == "build"){
				//try to build
				attempt = creep.build(target);
			} else if (task.job == "fix" && target.hits != target.hitsMax){//fix and actually needing more hits
				//try to fix
				attempt = creep.repair(target);
			}
			//error handling
			if (attempt == ERR_NOT_IN_RANGE){//not in range
				room.moveOrder(creep.name,task.x,task.y)
			} else if (attempt != ERR_NOT_ENOUGH_RESOURCES){//error?
				creep.say(attempt);
				//remove from array
				this.memory.build.active.splice(i, 1);
				//make sure to start here agein
				i -=1;
				//move creep to idle
				this.memory.build.idle.push(creep.name);
			}
			
		}//end for
	}//end prototype
	
	Room.prototype.setActive= function(){//new
		let tag = "[SAc 1.0]";
		//sets one of the build queue active, or returns false
		//we need to pull a new task
		let task = {};// a spot to put the new task
		if (this.memory.build.queues.hRep.length !=0){//if items exist assign it as task
			task = this.memory.build.queues.hRep.shift();
		} else if (this.memory.build.queues.hBuild.length !=0){//if items exist assign it as task
			task = this.memory.build.queues.hBuild.shift();
		} else if (this.memory.build.queues.mRep.length !=0){//if items exist assign it as task
			task = this.memory.build.queues.mRep.shift();
		} else if (this.memory.build.queues.lBuild.length !=0){//if items exist assign it as task
			task = this.memory.build.queues.lBuild.shift();
		} else if (this.memory.build.queues.lRep.length !=0){//if items exist assign it as task
			task = this.memory.build.queues.lRep.shift();
		} else {
			console.log(tag +"end of queue room.build "+ this.name);
			this.generateQueues();
		}
		//hopefully task was found, or it will be next time
		//what we should have is an object with an x,y,job, then either an ID or a structure type
		//the structure type will need to be a construction site, that we will assume is present,
		
		//attempt to fetch a construction site, if job is build
		if (task.job == "build"){
			//look for constuction site
			let look = this.lookForAt(LOOK_CONSTRUCTION_SITES, parseInt(task.x), parseInt(task.y));
			if (look.length !=0) {
				//save construction site
				task.id = look[0].id;
			} else {
				//construction site not found, create one, restore the task and return to leave the code
				let create= this.createConstructionSite(parseInt(task.x), parseInt(task.y), task.type);
				if (create==ERR_INVALID_TARGET){
					//the structure is done or another construction site is in the way, either way, this entry canot be compleated and may be finished
					//we will return without restoring the entry (it will be picked up agein if its not done)
					return false;//GTFU, as staying will cause errors
				}
				//we are going to restore the task to the beggining of hrep, since we don't know where it came from and hrep has highest prio
				this.memory.build.queues.hRep.unshift(task);
				return false;//GTFU, as staying will cause errors
			}
		}//end id fetch
		
		
		
		///start parking code
		//we need o find an x and y parking spot.
		//these where strings for some damb reason!!!
		task.x=parseInt(task.x);
		task.y=parseInt(task.y);
		//define area
		let area = [
			{x:task.x,y:task.y},
			{x:task.x-1,y:task.y-1},	{x:task.x,y:task.y-1}, 
			{x:task.x+1,y:task.y-1},	{x:task.x-1,y:task.y},
			{x:task.x+1,y:task.y}, {x:task.x-1,y:task.y+1},
			{x:task.x,y:task.y+1}, {x:task.x+1,y:task.y+1},
			//+2
			{x:task.x-2,y:task.y+2}, {x:task.x-2,y:task.y+1},
			{x:task.x-2,y:task.y}, {x:task.x-2,y:task.y-1},
			{x:task.x-2,y:task.y-2}, {x:task.x-1,y:task.y-2},
			{x:task.x-1,y:task.y+2}, {x:task.x,y:task.y+2},
			{x:task.x,y:task.y-2}, {x:task.x+1,y:task.y+2},
			{x:task.x+1,y:task.y-2}, {x:task.x+2,y:task.y+2},
			{x:task.x+2,y:task.y+1}, {x:task.x+2,y:task.y},
			{x:task.x+2,y:task.y-1}, {x:task.x+2,y:task.y-2},
			//+3
			{x:task.x-3,y:task.y+3}, {x:task.x-3,y:task.y+2},
			{x:task.x-3,y:task.y+1}, {x:task.x-3,y:task.y},
			{x:task.x-3,y:task.y-1}, {x:task.x-3,y:task.y-2},
			{x:task.x-3,y:task.y-3}, {x:task.x+3,y:task.y+3},
			{x:task.x+3,y:task.y+2}, {x:task.x+3,y:task.y+1},
			{x:task.x+3,y:task.y}, {x:task.x+3,y:task.y-1},
			{x:task.x+3,y:task.y-2}, {x:task.x+3,y:task.y-3},
			{x:task.x+2,y:task.y+3}, {x:task.x+2,y:task.y-3},
			{x:task.x+1,y:task.y+3}, {x:task.x+1,y:task.y-3},
			{x:task.x,y:task.y+3}, {x:task.x,y:task.y-3},
			{x:task.x-2,y:task.y+3}, {x:task.x-2,y:task.y-3},
			{x:task.x-1,y:task.y+3}, {x:task.x-1,y:task.y-3}
		];
		
		///change to not parking on a parking spot in use with another active
		
		//set an iterator
		let i=0;
		//iterate until no condition is true
		while (this.memory.terrainMatrix[area[i].x][area[i].y] == 1 || //a wall
		this.memory.buildSites[area[i].x][area[i].y].length !=0 || //a structure
		area[i].x<=0 || area[i].x>=49 || area[i].y<=0 || area[i].y>=49){//out of bounds
			//start of while
			//iterate position
			i++
			if (i == area.length){
				console.log(tag+"No Parking Found");
				i=0;
				break;
			}
		}
		//area[i] is now neither a wall a structure, or past the border, IE it is now a valid position
		///end parking code
		//update memory
		this.memory.build.active.push({
			x:area[i].x,
			y:area[i].y,
			job:task.job,
			id:task.id,
			creep:""
		});
		return true;
	}
	
	Room.prototype.generateQueues= function(){//new
		/*
		generates queues, normally run every 1000 ticks.
		Memory.build is where we are messing with
		Queues:
		High rep(all non decayable > decayable under 25%)
		dis (dismantle)
		High build (spawns> containers> towers> extensions> storage> links)
		Med Rep (decayable under 50%)
		low build (roads over swamp > everything else)
		Low rep (decayable over 50%)
		
		Queues:
		High prio since there is a limit to how many there can be, all in high prio will place construction sites on queue generation
		Low prio will place all swamp roads, +5 more objects capped to 25 (this should mean that one room never makes more than 50 construction sites at a time, assuming that it doesn't get attacked hard)
		*/
		let tag = "[GnQ 1.0]";
		console.log(tag+"["+this.name+"] Building queues.");
		//make sure build sites exist
		if (typeof this.memory.buildSites == "undefined"){
			//make an empty 3d array
			this.memory.buildSites = Array(50).fill().map(a=>Array(50).fill().map(b=>[]));
		}
		//create an array we can delete from (grrr objects)
		let sites = JSON.parse(JSON.stringify(this.memory.buildSites));
		
		//make sure build array exists
		if (typeof this.memory.build == "undefined"){
			this.memory.build = {active:[]};
		}
		//make an empty memory with properly set arrays
		this.memory.build.queues = {
			hRep:[],
			dismantle:[],
			hBuild:[],
			mRep:[],
			lBuild:[],
			lRep:[]
		};
		//buildings sort
		//find already placed structures
		let buildings = this.find(FIND_STRUCTURES,{
		filter: function(o) {return o.structureType != "controller" }});
		
		//this will be the structures we still need to place
		let construction=[];
		//this will be where we keep no good structures cropping up in out room.find!!
		let destroy = [];
		
		//loop through found buildings
		for(let i in buildings){
			let building = buildings[i];
			//looking in buildsites for structre(s) that are suppost to exist
			let site =sites[building.pos.x][building.pos.y];
			//find if the building should exist
			let arrayPos = site.indexOf(building.structureType);
			//if the value is -1 building should be removed, becouse its not on the list
			if(arrayPos ==-1){
				destroy.push({job:"dismantle",id:building.id,x:building.pos.x,y:building.pos.y});
			} else {
				//the structure exists in sites, we'll remove it so the only remaining sites are the ones needing construction
				sites[building.pos.x][building.pos.y].splice(arrayPos, 1);
			}
		}
		
		//save dismantle to memory
		this.memory.build.queues.dismantle = destroy;
		
		//reformat the remaining sites matrix entries into a queue, this containes all structures that need to be built
		for(let x in sites){
			for(let y in sites[x]){
				for(let i in sites[x][y]){
					//reformat
					construction.push({
						x:x,
						y:y,
						type:sites[x][y][i],
						job:"build"
					});
				}
			}
		}
		construction.forEach(function(o){
			//check health fractions
			if (o.type == STRUCTURE_SPAWN || o.type == STRUCTURE_TOWER || o.type == STRUCTURE_EXTENSION || o.type == STRUCTURE_STORAGE){//higher high prio stuff
				this.memory.build.queues.hBuild.unshift(o);//add to start
			} else if (o.type == STRUCTURE_CONTAINER || o.type == STRUCTURE_LINK){//lower high prio stuff
				this.memory.build.queues.hBuild.push(o);//add to high prio's end
			} else if (o.type == STRUCTURE_ROAD && this.memory.terrainMatrix[o.x][o.y] == 2){// if road on swamp
				this.memory.build.queues.lBuild.unshift(o);//add to start
			} else {//not a road on a swamp
				this.memory.build.queues.lBuild.push(o);//add to end
			}
		}, this);
		
		///filter in order the high prio? honestly may not be needed
		//high prio
		for (let i in this.memory.build.queues.hBuild){
			//get a roompos to work with
			let s = this.memory.build.queues.hBuild[i];
			let pos = this.getPositionAt(s.x, s.y);
			pos.createConstructionSite(s.type);
			
			//debug visuals (pretty)
			/*
			let debug = s.job +" x:"+s.x+" y:"+s.y+" type:"+s.type;
			new RoomVisual(this.name).text(debug, 15, 3+parseInt(i), {align:"right"});
			new RoomVisual(this.name).line(15, 3+parseInt(i), parseInt(s.x),parseInt(s.y));
			*/
		}
		//low prio
		this.memory.build.queues.lBuild.splice(15);//so much fore placing all swamp laiden ones, but whateves
		for (let i in this.memory.build.queues.lBuild){
			//get a roompos to work with
			let s = this.memory.build.queues.lBuild[i];
			let pos = this.getPositionAt(s.x, s.y);
			pos.createConstructionSite(s.type);
		}
		
		//grab any under health structures that aren't walls or ramparts
		let damaged = buildings.filter(function(o) { return (o.structureType !== STRUCTURE_WALL) && (o.hitsMax !== STRUCTURE_RAMPART) && (o.hits != o.hitsMax)});
		//sort damaged into priority lists
		damaged.forEach(function(o){
			//format
			let fix = {
				x:o.pos.x,
				y:o.pos.y,
				id:o.id,
				job:"fix"
			}
			//check health fractions
			if (typeof o.ticksToDecay == "undefined"){
				//non decayable
				this.memory.build.queues.hRep.unShift(fix);
			} else if (o.hits < o.hitsMax/4){
				//decayable, less than 1/4 health
				this.memory.build.queues.hRep.push(fix);
			} else if (o.hits < o.hitsMax/2){
				//decayable, less than 1/2 health
				this.memory.build.queues.mRep.push(fix);
			} else {
				//decayable, more than 1/2 health
				this.memory.build.queues.lRep.push(fix);
			} 
		},this);//end repairs
		
	}
		
};





