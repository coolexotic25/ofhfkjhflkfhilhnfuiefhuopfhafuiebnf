/*
  _____            _           ____        _   
 |  __ \          | |         |  _ \      | |  
 | |  | |_ __ __ _| | _____   | |_) | ___ | |_ 
 | |  | | '__/ _` | |/ / _ \  |  _ < / _ \| __|
 | |__| | | | (_| |   < (_) | | |_) | (_) | |_ 
 |_____/|_|  \__,_|_|\_\___/  |____/ \___/ \__|
                                             
                                        
 Thank you for choosing Drako Bot!

 Should you encounter any issues, require assistance, or have suggestions for improving the bot,
 we invite you to connect with us on our Discord server and create a support ticket: 

 http://discord.drakodevelopment.net
 
*/

const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require ("discord.js")
const fs = require('fs');
const yaml = require("js-yaml")
const config = yaml.load(fs.readFileSync('././config.yml', 'utf8'))
const lang = yaml.load(fs.readFileSync('././lang.yml', 'utf8'))
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dogfact')
        .setDescription(`Get a random dog fact`),
    async execute(interaction, client) {
        try {

        let dogfacts = [ 
            "15 people die in the U.S. every year from dog bites.",
            "30% of Dalmatians are deaf in one ear.",
            "45% of dogs sleep in their owner's bed (we're pretty sure a large percentage also hog the blankets!).",
            "58% of people put pets in family and holiday portraits.",
            "62% of U.S. households own a pet, which equates to almost 73 million homes.",
            "70% of people sign their pet's name on greeting and holiday cards.",
            "87% of dog owners say their dog curls up beside them or at their feet while they watch TV.",
            "A blind man and his guide dog hiked the Appalachian Trail.",
            "A Bloodhound's sense of smell can be used as evidence in court.",
            "According to a poll, 72% of dog owners believe their dog can detect when stormy weather is on the way.",
            "A dog's mouth exerts 150-200 pounds of pressure per square inch. Some dog breeds can exert up to 450 pounds per square inch.",
            "A dog's normal temperature is between 101 and 103 degrees Fahrenheit (38 and 39 Celsius).",
            "A dog's nose prints are as unique as a human's fingerprints and can be used to accurately identify them.",
            "A dog's only sweat glands are between their paw pads.",
            "A Dog's sense of smell is 10 to 100 thousand times more acute as that of humans.",
            "A German Shepherd guide dog led her blind companion through the entire 2100-mile Appalachian trail.",
            "A Greyhound could beat a Cheetah in a long-distance race.",
            "A large breed dog's resting heart beats between 60 to 100 times per minute, and a small dog breed's heart beats between 100-140. Comparatively, a resting human heart beats 60-100 times per minute.",
            "An African wolf dog known as the Basenji is the only dog in the world that cannot bark.",
            "An American Animal Hospital Association poll found that 33% of dog owners admit to talking to their dogs on the phone and leaving answering machine messages for them while away.",
            "An estimated 1 million dogs in the U.S. have been named as the primary beneficiaries in their owner's will.",
            "A one-year-old dog is as mature, physically, as a 15-year-old human.",
            "A study at UCSD claims that your dog can genuinely get jealous when they see you display affection for another creature.",
            "Basenji dogs don't bark, they yodel.",
            "Basset Hounds cannot swim.",
            "Bingo is the name of the dog on the side of the Cracker Jack box.",
            "Chow Chows and Shar-Peis have black tongues.",
            "Dachshunds were originally bred to fight badgers.",
            "Dalmatian puppies are pure white when they are born and develop their spots as they grow older.",
            "Dogs and humans have the same type of slow wave sleep (SWS) and rapid eye movement (REM), and during this REM stage, dogs can dream. The twitching and paw movements that occur during their sleep are signs that your pet is dreaming.",
            "Dogs can be trained to detect cancer and other diseases in humans. Cancerous cells release different metabolic waste products than healthy cells in the human body. Dogs may even be able to sniff out cancer cells simply through smelling someone's breath.",
            "Dogs chase their tails for a variety of reasons: curiosity, exercise, anxiety, predatory instinct, or because of fleas.",
            "Dogs curl up in a ball when they sleepdue to an age-old instinct to keep themselves warm and protect their abdomen and vital organs from predators.",
            "Dogs do have better low-light vision than humans because of a special light-reflecting layer behind their retinas.",
            "Dogs do not have an appendix.",
            "Dogs' ears are extremely expressive. It's no wonder! There are more than a dozen separate muscles that control a dog's ear movements.",
            "Dogs' eyes contain a special membrane, called the tapetum lucidum, which allows them to see in the dark.",
            "Dogs have about 1700 taste buds. Humans have approximately 9000, and cats have around 473.",
            "Dogs have a sense of time. It's been proven that they know the difference between an hour and five. If conditioned to, they can predict future events, such as regular walk times.",
            "Dogs have three eyelids: an upper lid, a lower lid, and the third lid, called a nictitating membrane or 'haw,' which helps keep the eye moist and protected.",
            "Dogs have wet noses because it helps to absorb scent chemicals.",
            "Dogs' noses are wet to help absorb scent chemicals.",
            "Dogs' noses secrete a thin layer of mucus that helps them absorb scent. They then lick their noses to sample the scent through their mouth.",
            "Dogs that have been spayed or neutered live longer than dogs who are intact.",
            "Do you have a dog that experiences separation anxiety? Try leaving some clothing with him that you've worn. It's been proven that the scent you leave behind on your clothes can help ease your dog's separation anxiety.",
            "Every dog on earth likely descended from a species known as the Tomarctus - a creature that roamed the earth over 15 million years ago.",
            "Former Michael Vick dogs, Sox and Hector, are certified therapy dogs. They now spend their days cheering up people at hospitals, nursing homes, and schools.",
            "Gidget is the name of the Taco Bell dog.",
            "Greyhounds are the fastest dogs on earth, with speeds of up to 45 miles per hour.",
            "Have you ever wondered why your dog curls up in a ball when they sleep? It's actually an age-old instinct to keep themselves warm and to protect vital organs while they sleep.",
            "Humans have kept dogs as pets for over 12 thousand years.",
            "If never spayed or neutered, a female dog, her mate, and their puppies could produce over 66 thousand dogs in 6 years!",
            "In 1957, Laika became the first living being in space via an earth satellite.",
            "In 2002, more people in the U.S. were killed by dogs than by sharks during the past 100 years.",
            "In addition to sweating through their paw pads, dogs pant to cool themselves off. A panting dog can take 300-400 breaths (compared to his regular 30-40) with very little effort.",
            "In Roman times, mastiffs donned light armor and were sent after mounted knights.",
            "It is a myth that dogs are color blind. They can actually see in color, just not as vividly as humans. It is similar to our vision at dusk.",
            "It's a myth that dogs only see in black and white. In fact, it's believed that dogs see primarily in blue, greenish-yellow, yellow, and various shades of gray.",
            "It's rumored that, at the end of the Beatles song, 'A Day in the Life,' Paul McCartney recorded an ultrasonic whistle, audible only to dogs, just for his Shetland sheepdog.",
            "JFK's terrier, Charlie, fathered 4 puppies with Laika's daughter.",
            "Labradors have been the most popular breed in the United States for the last 26 years.",
            "Like human babies, Chihuahuas are born with a soft spot in their skull which closes with age.",
            "Man's best friend? Petting a dog and gazing into their eyes releases oxytocin (i.e., the 'love hormone') not only for you but for them as well.",
            "More than half of all U.S presidents have owned dogs.",
            "Newfoundlands are amazing lifeguards.",
            "Newfoundlands are great swimmers because of their webbed feet.",
            "Obesity is the #1 health problem among dogs.",
            "Only dogs and humans have prostates.",
            "President Lyndon Johnson had two beagles named Him and Her.",
            "Puppies have 28 teeth, and normal adult dogs have 42.",
            "Scientists believe that the world's first known dog lived 31,700 years ago. This prehistoric dog resembled a large Siberian Husky.",
            "Seeing eye dogs are trained to do their 'business' on command. This way their owner can clean it up a bit easier. Some of the popular commands are 'get busy' and 'go time'.",
            "Sound frequency is measured in Hertz (Hz). The higher the Hertz, the higher-pitched the sound. Dogs hear best at 8000 Hz, while humans hear best at around 2000 Hz.",
            "Spiked collars were originally fashioned in ancient Greece to protect dogs' throats from wolf attacks."
        ]            

            await interaction.deferReply();
            let dogfact = dogfacts[Math.floor(Math.random() * dogfacts.length)];
            interaction.editReply({ content: `**🐶 RANDOM DOG FACT**\n${dogfact}` });
        } catch (error) {
            console.error("Error in dogfact command: ", error);
            interaction.editReply({ content: 'Sorry, I couldn\'t fetch a dog fact at the moment.' });
        }
    }
}