import Fiber from 'fibers';

import {Meteor} from 'meteor/meteor';
import {WebApp} from 'meteor/webapp';

import {Listings} from '../imports/api/listings';
import {Plans} from '../imports/api/plans';

WebApp.connectHandlers.use("/stripe-webhooks", function(request, response) {
	if(request.method!='POST') {
        response.writeHead(404);
        return response.end();
    }
	
	var bodyarr = [];

    request.on('data', function(chunk) {
        bodyarr.push(chunk);
    });

    request.on('end', function() {
		response.writeHead(200);
		response.end();

		var body = JSON.parse(bodyarr.join());
		
		if (body.type == "ping") return;
		
		Fiber(function(){
			var verify;
			try	{
				verify = JSON.parse(stripe.events.retrieve(body.id));
			} catch(err){
				console.error("Error in stripe webhook verification");
				throw new Meteor.Error("stripe-error", err.message);
			}

			if (!verify) return;
			
			switch(verify.type){
				case "charge.failed":
					if (verify.data.object.status != "failed") return;
					var user = Meteor.users.findOne({"profile.stripeid": verify.data.object.customer});
					if (!user) return;
					Meteor.users.update({_id: user._id}, {$set: {"profile.authorized": false}});
					
					Listings.update({userId: user._id}, {$set: {authorized: false}});
					break;
				case "charge.succeeded":
					if (verify.data.object.status != "succeeded") return;
					var user = Meteor.users.findOne({"profile.stripeid": verify.data.object.customer});
					Meteor.users.update({_id: user._id}, {$set: {"profile.authorized": true}});
					
					Listings.update({userId: user._id}, {$set: {authorized: true}});
					break;
				//Self heal for stripe plans
				case "plan.deleted":
					var plan = Plans.findOne({_id: verify.data.object.id});
					if (!plan) return;
					try {
						var amount = parseFloat(plan.amount).toFixed(2).toString().replace(".","");
						stripe.plans.create({
							amount: amount,
							interval_count: plan.interval,
							interval: plan.period,
							name: plan.name,
							currency: "usd",
							id: plan._id,
							trial_period_days: plan.trial
						});
					} catch(err) {
						console.error("Error in stripe plan deleted self healing");
						throw new Meteor.Error("stripe-error", err.message);
					}
					break;
				//Self heal for stripe users
				case "customer.deleted": 
					var user = Meteor.users.findOne({"profile.stripeid": verify.data.object.id});
					if (!user) return;
					try {
						/*
						// Due to Stripe's tokenization method to add payment sources, there's no way to 
						// restore the account's payment sources without storing payment data in our database,
						// losing PCI compliance.
						//
						// Subscriptions in Stripe are tied to a customers id, this id is generates by Stripe, 
						// and there's no way to transfer a subscription to a newly generated id, so there's no way
						// to restore the subscriptions once the stripe user is deleted.
						//
						*/
						var newStripeUser = stripe.customers.create({
							description: verify.data.object.description
						});
						Meteor.users.update({_id: user._id}, {
							$set: {"profile.stripeid": newStripeUser.id, "profile.authorized": false},
							$unset: {"profile.plan": ""}
						});
						Listings.update({userId: user._id}, {$set: {authorized: false}});
					} catch(err) {
						console.error("Error in stripe customer deleted self healing");
						throw new Meteor.Error("stripe-error", err.message);
					}
					break;
			}
		}).run();
    });
});
