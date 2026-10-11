/* Rap Battle lyric bank (?rap). Each rapper's couplets are aimed at the other one.
   Tiers: safe 75%, spicy 50%, nuclear 25%; the finisher is a double-time verse offered on the very last pick.
   A battle draws without repeats, so more couplets per tier means more battles before lines come back. */
window.POF_RAP_LYRICS = {
  toly: {
    safe: [
      ["I ship phones to your hands, you ship posts to your blog", "Every swap on your chain is a gas-guzzling slog"],
      ["Four hundred milliseconds, my block's done in a blink", "Your transaction's pending, go pour you a drink"],
      ["Cheap, fast, chain, gud, that's the whole creed", "Your swap costs a kidney, mine costs a seed"],
      ["I put a chain in a phone and the phone in your hand", "You put a roadmap in a blog nobody can understand"],
      ["You got fifty layer twos and they don't even talk", "It's a mall full of bridges and you still have to walk"],
      ["I sip on my coffee while the blocks fly by", "You sip on your green tea while your fees hit the sky"],
      ["You need a PhD just to bridge to L2", "I need one thumb and the phone does it for you"],
      ["Your shirt's got a unicorn, your chain's got the same", "Mythical throughput, what a beautiful name"]
    ],
    spicy: [
      ["Your gas got so high, man, it needs an intervention", "Fifty layer twos and not one gets a mention"],
      ["Your roadmap's a maze where the exit's a rollup", "Read the blog post, then the sequel, then the follow-up"],
      ["You dance like a badger that lost all its keys", "Even your meme coins pay gas to say please"],
      ["Your foundation sells tops like it's reading the chart", "Every time they cash out, the market falls apart"],
      ["Your validators stake thirty-two and then wait", "By the time they withdraw it's a whole different date"],
      ["You built the world computer at fifteen TPS", "That's Windows 95 in a unicorn dress"],
      ["Your rollups got rollups, your layers got layers", "It's an onion of bridges for confused little players"],
      ["You've been saying it's early since twenty-fifteen", "At this point early means you're late to the scene"]
    ],
    nuclear: [
      ["Ultrasound money? Bro, your speaker is on mute", "Took six years to merge in a unicorn suit"],
      ["You wrote a ten-page essay on why fees are fine", "I wrote increase bandwidth, reduce latency, one line"],
      ["Ethereum's the settlement layer, that's what they say", "That's a fancy way of saying it's too slow to pay"],
      ["Your L2s are your landlords and they're charging you rent", "Every sequencer's cashing while your users get spent"],
      ["Sharding since twenty-seventeen and it still isn't done", "I shipped two phones and a chain and I'm having fun"],
      ["Your degens moved to me, even the dogs moved in", "Your chain's a museum, mine's where the kids win"]
    ],
    finisher: {
      name: 'Skibidi mode',
      lines: [
        "Slop, kino, skibidi bop, I don't stop, I hop on the block, ship it to prod, top of the charts",
        "Chewing on glass while you blog it in parts, skibidi, skibidi, cheap fast chain, SKIBIDI BOP"
      ]
    }
  },
  vitalik: {
    safe: [
      ["Your chain's so fast that it forgot to stay on", "Validators on Discord asking where it has gone"],
      ["You sell a phone like a late-night infomercial", "My roadmap's so deep that it's barely commercial"],
      ["Four hundred milliseconds, then a seventeen-hour nap", "My chain never sleeps, yours restarts like an app"],
      ["You need a data center just to run a single node", "I stake from a laptop at the end of a dirt road"],
      ["Your whole chain's a casino with a dog in a hat", "Every coin is a rug and you're proud of that"],
      ["You shipped a phone and the airdrop paid for the box", "Nobody made a call, they just flipped it for the BONKs"],
      ["You tell devs to chew glass, that's the onboarding plan", "Mine get a forty-page post and a cup of tea, man"],
      ["You wear that cap like you're hiding the restarts", "I wear a unicorn because I'm the one with the smarts"]
    ],
    spicy: [
      ["Your chain's a Nasdaq? nah, it's a slot machine", "Pump, dump, restart, the fastest casino I've seen"],
      ["Your hardware requirements need a power plant", "Decentralized? Bro, you physically can't"],
      ["Solana went down like the sales on that phone", "Even the outage had an outage of its own"],
      ["You got a headset mic like you work the drive-through", "Would you like fries with that network restart, too?"],
      ["I swapped the engine mid-flight and the plane kept flying", "Yours stalls on the runway with the validators crying"],
      ["Second best salesman, and that's being nice", "The first best sold your phone at half the price"],
      ["Your fees are so cheap because the users are bots", "A million transactions and the humans got naught"],
      ["You brag about speed like it's all that you got", "A fast car's no good when it's stuck in the lot"]
    ],
    nuclear: [
      ["I got the Surge, the Verge, the Purge and the Splurge", "You got a restart button and a nervous urge"],
      ["Seventeen hours down and you called it a feature", "I've seen more uptime from a substitute teacher"],
      ["I wrote the whitepaper when I was nineteen", "You were at Qualcomm debugging a coffee machine"],
      ["Ethereum's the world computer, the whole thing is mine", "Yours is a world calculator that's down half the time"],
      ["Your chain's so fast that the bots got there first", "Ninety percent sandwiches, your users got the worst"],
      ["Your token's a casino, your phone's a slot", "Your chain's a Nasdaq that the Nasdaq forgot"]
    ],
    finisher: {
      name: 'Badger mode',
      lines: [
        "Badger, badger, badger, badger, ultrasound, the Surge, the Verge, the Purge, the Splurge, world computer",
        "Green tea, unicorn, the roadmap's a banger, badger, badger, badger, badger, MUSHROOM, MUSHROOM"
      ]
    }
  }
};
