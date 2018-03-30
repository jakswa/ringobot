const CACTUS_FACTS = [
  'Size of cactus depends on the species. Largest species of cactus can reach 66 feet in height and weigh up to 4800 pounds (when it is fully loaded with water). Smallest species usually have only few inches in height.',
  'Cactus can have arborescent (tree-like), cylindrical, rounded, irregular or starfish shape. Surface can be flat or covered with ridges.',
  'Cacti can be green, bluish or brown-green in color. They have waxy substance on the surface which prevents loss of water via transpiration (loss of water through small holes when outer temperature is high).',
  'Cacti have spines instead of leaves. Spines can be soft or rigid, straight or curved, arranged in rows or scattered. They can reach 6 inches in length.',
  'Spines have two major roles: they prevent loss of water via transpiration and keep the plant safe from animals.',
  'Each spine develops from areole, which looks like a bump or nipple-like structure on the surface of the cactus.',
  'Since cacti live in dry areas, they need to absorb large amount of water and store it in the stem and roots for the periods of drought. Besides storing of water, stem plays role in the process of photosynthesis (production of food by using the sunlight and carbon dioxide).',
  'Water from cactus has higher density compared with tap water, but it is safe for drinking.',
  'Roots of cacti are located few inches underground, but they can reach 7 feet in diameter because water easily passes through the sand.',
  'Cacti have dormant periods and periods of intense growth and blossoming. Periods of growth require enough water and sunlight and they usually last shorter than periods of rest.',
  'Size and shape of flower depends on the species of cacti and type of pollination. They can be white, red, orange, pink or blue in color.',
  'Butterflies, bees, moths, bats and hummingbirds are main pollinators of cacti.',
  'Spines of cactus can be used in the production of hooks, combs and needles. Fruit can be used as food.',
  'Certain cacti produce substance called mescaline which induces hallucinogenic effects. It has been used by shamans to induce trance-like state and ensure "communication" with God.',
  'Cacti can survive from 15 to 300 years, depending on the species.',
  'Depending on the species, cactus\'s spines can be extremely fragile or terrible venomous spikes, several centimeters long.',
  'Cactus spines can be used for sutures, after they have been first sterilized on hot coal.',
  'There are over 2,000 species of cacti, with various shapes and forms. Caldera cacti in southwestern US can overcome 20 m (66 ft) on height, while Rebutia cacti from Bolivia and Argentina are just several centimeters tall.'
];

class CactusFacts {
  static responseFor(message, rtm) {
    if (message.text.match(/cact(us|i) facts/i)) {
      let cf = CACTUS_FACTS[Math.floor(CACTUS_FACTS.length * Math.random())];
      rtm.sendMessage(cf, message.channel)
    }
  }
}

CactusFacts.help = [
  '`cact[us|i] facts` - print a fact about cacti'
]

module.exports = CactusFacts
