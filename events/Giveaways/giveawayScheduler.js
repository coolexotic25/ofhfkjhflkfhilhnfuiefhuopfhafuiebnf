const cron = require('node-cron');
const Giveaway = require('../../models/Giveaway.js'); 
const giveawayActions = require("../../events/Giveaways/giveawayActions.js");

const fs = require("fs");
const yaml = require("js-yaml");
const config = yaml.load(fs.readFileSync("./config.yml", "utf8"));

async function checkGiveaways() {
    try {
        const giveaways = await Giveaway.find({ ended: false });
        const now = new Date().getTime();

        for (const giveaway of giveaways) {
            if (now > giveaway.endAt) {
                console.log('Ending giveaway:', giveaway.giveawayId);
                await giveawayActions.endGiveaway(giveaway.giveawayId);
            }
        }
    } catch (error) {
      //  console.log(error);
    }
}

function startGiveawayScheduler() {
    const checkIntervalInSeconds = config.Giveaways.GiveawayStatusCheck / 1000;
    const cronPattern = `*/${checkIntervalInSeconds} * * * * *`;
    cron.schedule(cronPattern, checkGiveaways);
}

module.exports = startGiveawayScheduler;