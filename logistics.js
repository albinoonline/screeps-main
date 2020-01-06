module.exports = function(){
	Room.prototype.logisticsUpdate= function(){
		//update logistics queues in memory.
		
		// pickup storage, harvest containers, recycle container
		
		//drop off storage, recycle container, upgrade container, construction creep, towers?
		
		//create a pickup array, holding id, in the order pickups should be made
		let pickup = [];
		//create a drop off array, holding id, in the order deliveries should be made
		let dropOff = [];
		//array of id and percent difference from desired , used at end to sort
		let toFilter = []
		
		//loop through harvest
		for(let i in this.memory.harvest){
			//grab object
			let site = Game.getObjectById(this.memory.harvest[i].container);
			//get easy percent value
			let fillPercent = site.store[RESOURCE_ENERGY]/site.storeCapacity;
			//if overfull, add to front of array
			if (fillPercent > 0.75){
				pickup.unshift(this.memory.harvest[i].container);
			}
			//add to filter
			toFilter.push({id:this.memory.harvest[i].container,fill:fillPercent-0.10});
		}
		
		//add recycle
		//grab object
		let recycle = Game.getObjectById(this.memory.recycle.container);
		//get easy percent value
		let fillPercent = recycle.store[RESOURCE_ENERGY]/recycle.storeCapacity;
		//if overfull, add to front of array
		if (fillPercent > 0.95){
			pickup.unshift(this.memory.recycle.container);
		}
		//add desired value differental
		toFilter.push({id:this.memory.recycle.container,fill:fillPercent-0.60});
		//if under full add to requests()dropOff
		if (fillPercent < 0.30){
			dropOff.unshift(this.memory.recycle.container);
		}
		///add storage
		///add towers
		//construction creeps
		let constructionCreeps = this.find(FIND_MY_CREEPS, {
			filter: function(o) { return o.memory.role == "construction"; }
		});
		for (i in constructionCreeps){
			let constructionCreep = constructionCreeps[i];
			//get easy percent value
			let upgradeFillPercent = constructionCreep.carry[RESOURCE_ENERGY]/constructionCreep.carryCapacity;
			//add desired value differental
			toFilter.push({id:constructionCreep.id,fill:upgradeFillPercent-0.90});
			//if under full add to requests()dropOff
			if (upgradeFillPercent < 0.30){
				dropOff.unshift(constructionCreep.id);
			}
		}
		
		//upgrade
		//grab object
		let upgrade = Game.getObjectById(this.memory.upgrade.container);
		//get easy percent value
		let upgradeFillPercent = upgrade.store[RESOURCE_ENERGY]/upgrade.storeCapacity;
		//add desired value differental if not quite full
		if (upgradeFillPercent < 0.90){
			toFilter.push({id:this.memory.upgrade.container,fill:upgradeFillPercent-0.20});
		}
		
		//if under full add to requests dropOff
		if (upgradeFillPercent < 0.10){
			dropOff.unshift(this.memory.upgrade.container);
		}
		
		//sort toFilter
		let filtered= toFilter.sort(function(a, b) {
			return a.value - b.value;
		});
		//set some arrays for reformatting
		let dropOffNormal=[];
		let pickupNormal=[];
		
		//reformat the array of objects into an array of ids. add them to arrays
		for (i in filtered){
			let item = filtered[i];
			dropOffNormal.unshift(item.id);
			pickupNormal.push(item.id);
		}//save to memory
		this.memory.logistics = {pickup: pickup.concat(pickupNormal), dropOff: dropOff.concat(dropOffNormal)};
	}
};