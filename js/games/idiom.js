/* Guess the Chinese Idiom (看图猜成语) — single player.
 * An emoji clue hints at a 4-character chengyu; pick the right idiom from the
 * choices. 3 guesses per idiom; after a wrong guess a 💡 hint (meaning only —
 * no pinyin, so it's not a giveaway) unlocks. Multiple-choice input works with
 * touch or mouse — no Chinese keyboard. */
Arcade.register({
  id: "idiom",
  name: "看图猜成语",
  emoji: "🀄",
  tagline: "根据表情符号线索猜出中文成语。",
  tags: ["Word", "Puzzle", "Solo"],
  category: "chinese",
  minPlayers: 1,
  maxPlayers: 1,
  leaderboard: { type: "score" }, // ranks by the most idioms solved in one game, highest → lowest
  rules: [
    "表情符号线索暗示一个四字成语（chéngyǔ）。",
    "从选项中选出对应的成语——你有 3 次机会。",
    "猜错后，点击 💡 提示可显示释义（每题一次）——拼音不显示，以免太容易。",
    "猜的次数越少、不用提示，得分越高。",
    "完成所有回合即结束——排行榜按一局中猜对最多成语排名。",
  ],
  options: [
    { key: "rounds", label: "回合数", type: "select", default: 15,
      choices: [{ label: "5", value: 5 }, { label: "10", value: 10 }, { label: "15", value: 15 }] },
    { key: "choices", label: "选项数", type: "select", default: 4,
      choices: [{ label: "简单（3）", value: 3 }, { label: "普通（4）", value: 4 }, { label: "困难（6）", value: 6 }] },
  ],

  create(api) {
    // idiom, pinyin, emoji clue, English meaning (en), Chinese meaning (cn)
    const DATA = [
      { idiom: "画蛇添足", pinyin: "huà shé tiān zú", emoji: "🐍➕🦶", en: "Draw a snake and add feet — ruin it by overdoing it.", cn: "多此一举，反而把事情弄糟。" },
      { idiom: "一石二鸟", pinyin: "yī shí èr niǎo", emoji: "🪨🐦🐦", en: "One stone, two birds — achieve two goals at once.", cn: "做一件事同时得到两种好处。" },
      { idiom: "守株待兔", pinyin: "shǒu zhū dài tù", emoji: "🌳⏳🐰", en: "Guard a stump waiting for a rabbit — wait idly for luck.", cn: "不主动努力，妄想坐等收获。" },
      { idiom: "亡羊补牢", pinyin: "wáng yáng bǔ láo", emoji: "🐑🚪🔧", en: "Mend the pen after losing sheep — fix things before worse harm.", cn: "出了问题及时补救还不算晚。" },
      { idiom: "井底之蛙", pinyin: "jǐng dǐ zhī wā", emoji: "🕳️🐸", en: "A frog at the bottom of a well — someone of narrow vision.", cn: "比喻见识短浅的人。" },
      { idiom: "对牛弹琴", pinyin: "duì niú tán qín", emoji: "🐂🎵🎹", en: "Play the lute to a cow — talk to the wrong audience.", cn: "对不懂的人讲道理，白费力气。" },
      { idiom: "杯弓蛇影", pinyin: "bēi gōng shé yǐng", emoji: "🍷🏹🐍", en: "A bow's reflection in a cup mistaken for a snake — needless fear.", cn: "因疑神疑鬼而自相惊扰。" },
      { idiom: "狐假虎威", pinyin: "hú jiǎ hǔ wēi", emoji: "🦊🎭🐯", en: "Fox borrows the tiger's might — bully others using borrowed power.", cn: "倚仗别人的势力欺压人。" },
      { idiom: "掩耳盗铃", pinyin: "yǎn ěr dào líng", emoji: "🙉🔔🦹", en: "Cover ears to steal a bell — deceive only oneself.", cn: "自欺欺人，掩盖不了事实。" },
      { idiom: "刻舟求剑", pinyin: "kè zhōu qiú jiàn", emoji: "🚣✂️🗡️", en: "Notch the boat to find the sword — cling to rigid methods.", cn: "拘泥成法，不知变通。" },
      { idiom: "揠苗助长", pinyin: "yà miáo zhù zhǎng", emoji: "🌱⬆️🙌", en: "Pull up sprouts to help them grow — spoil things through haste.", cn: "违背规律急于求成反坏事。" },
      { idiom: "塞翁失马", pinyin: "sài wēng shī mǎ", emoji: "👴🐴❓", en: "The old frontiersman lost his horse — a blessing in disguise.", cn: "坏事有时也能变成好事。" },
      { idiom: "盲人摸象", pinyin: "máng rén mō xiàng", emoji: "🦯👨🐘", en: "Blind men touch an elephant — judge a whole from one part.", cn: "只凭片面就妄下结论。" },
      { idiom: "画龙点睛", pinyin: "huà lóng diǎn jīng", emoji: "🐉🖌️👁️", en: "Dot the dragon's eyes — add the crucial finishing touch.", cn: "在关键处点明使之传神。" },
      { idiom: "胸有成竹", pinyin: "xiōng yǒu chéng zhú", emoji: "🫀🎋✅", en: "Have a bamboo in mind — be fully prepared and confident.", cn: "做事之前已有完整把握。" },
      { idiom: "滥竽充数", pinyin: "làn yú chōng shù", emoji: "🎶🙅🔢", en: "Fill a spot with a fake flutist — pass off the unqualified.", cn: "无本事的人混在行家里凑数。" },
      { idiom: "叶公好龙", pinyin: "yè gōng hào lóng", emoji: "🧑🐉😱", en: "Lord Ye loves dragons — claim to like what you really fear.", cn: "表面爱好，实际并不真喜欢。" },
      { idiom: "愚公移山", pinyin: "yú gōng yí shān", emoji: "👴⛰️🪏", en: "The foolish old man moves mountains — persistence conquers all.", cn: "有恒心毅力终能成功。" },
      { idiom: "精卫填海", pinyin: "jīng wèi tián hǎi", emoji: "🐦🪨🌊", en: "The Jingwei bird fills the sea — unyielding determination.", cn: "意志坚定，不畏艰难。" },
      { idiom: "卧薪尝胆", pinyin: "wò xīn cháng dǎn", emoji: "🛏️🌿👅", en: "Sleep on sticks, taste gall — endure hardship for revenge.", cn: "刻苦自励，发愤图强。" },
      { idiom: "完璧归赵", pinyin: "wán bì guī zhào", emoji: "💎↩️🏯", en: "Return the jade intact to Zhao — give something back unharmed.", cn: "把原物完好地归还本主。" },
      { idiom: "负荆请罪", pinyin: "fù jīng qǐng zuì", emoji: "🎒🌿🙇", en: "Carry thorns to apologize — sincerely admit one's fault.", cn: "主动向人认错赔罪。" },
      { idiom: "纸上谈兵", pinyin: "zhǐ shàng tán bīng", emoji: "📃🗣️⚔️", en: "Discuss war on paper — empty theory without practice.", cn: "空谈理论，不能解决实际问题。" },
      { idiom: "四面楚歌", pinyin: "sì miàn chǔ gē", emoji: "🧭🎵😰", en: "Chu songs on all sides — beset by enemies everywhere.", cn: "陷入四面受敌的孤立境地。" },
      { idiom: "破釜沉舟", pinyin: "pò fǔ chén zhōu", emoji: "🍳💥⛵", en: "Smash pots and sink boats — burn bridges, fight to the end.", cn: "下定决心，不留退路。" },
      { idiom: "指鹿为马", pinyin: "zhǐ lù wéi mǎ", emoji: "👉🦌🐴", en: "Call a deer a horse — deliberately distort the truth.", cn: "故意颠倒黑白，混淆是非。" },
      { idiom: "草木皆兵", pinyin: "cǎo mù jiē bīng", emoji: "🌿🌳⚔️", en: "Every bush looks like a soldier — panic sees enemies everywhere.", cn: "惊慌时疑神疑鬼。" },
      { idiom: "望梅止渴", pinyin: "wàng méi zhǐ kě", emoji: "🍑👀🥤", en: "Quench thirst by thinking of plums — comfort with empty hopes.", cn: "用空想来安慰自己。" },
      { idiom: "唇亡齿寒", pinyin: "chún wáng chǐ hán", emoji: "👄❌🦷", en: "Lips gone, teeth cold — shared fate of closely linked parties.", cn: "双方利害相关，互相依存。" },
      { idiom: "唇齿相依", pinyin: "chún chǐ xiāng yī", emoji: "👄🦷🤝", en: "Lips and teeth depend on each other — mutual reliance.", cn: "关系密切，相互依靠。" },
      { idiom: "一箭双雕", pinyin: "yī jiàn shuāng diāo", emoji: "🏹🦅🦅", en: "One arrow, two hawks — gain two ends with one act.", cn: "一举两得。" },
      { idiom: "亡命之徒", pinyin: "wáng mìng zhī tú", emoji: "🏃💀🦹", en: "A desperado on the run — a reckless, lawless person.", cn: "不顾性命冒险作恶的人。" },
      { idiom: "九牛一毛", pinyin: "jiǔ niú yī máo", emoji: "🐂9️⃣🧶", en: "One hair from nine oxen — a tiny part of something vast.", cn: "极大数量中微不足道的一点。" },
      { idiom: "一毛不拔", pinyin: "yī máo bù bá", emoji: "🧶🚫✋", en: "Won't pull out a single hair — extremely stingy.", cn: "形容人非常吝啬自私。" },
      { idiom: "一目了然", pinyin: "yī mù liǎo rán", emoji: "👁️💡✅", en: "Clear at one glance — instantly obvious.", cn: "一看就完全明白。" },
      { idiom: "一帆风顺", pinyin: "yī fān fēng shùn", emoji: "⛵💨😄", en: "Smooth sailing with a full wind — everything goes smoothly.", cn: "事情进行得非常顺利。" },
      { idiom: "一举两得", pinyin: "yī jǔ liǎng dé", emoji: "1️⃣🙌2️⃣", en: "One move, two gains — accomplish two things at once.", cn: "做一件事得到两方面好处。" },
      { idiom: "一见钟情", pinyin: "yī jiàn zhōng qíng", emoji: "👀❤️💘", en: "Fall in love at first sight — instant romantic attraction.", cn: "初次见面就产生爱情。" },
      { idiom: "一鸣惊人", pinyin: "yī míng jīng rén", emoji: "🐓📢😲", en: "One cry astounds all — sudden, stunning achievement.", cn: "平时无声，一下子做出惊人成绩。" },
      { idiom: "一诺千金", pinyin: "yī nuò qiān jīn", emoji: "🤝💰💯", en: "A promise worth a thousand gold — keep one's word.", cn: "说话算数，极守信用。" },
      { idiom: "一丝不苟", pinyin: "yī sī bù gǒu", emoji: "🧵🔍✅", en: "Not careless by a single thread — meticulous in everything.", cn: "做事认真，丝毫不马虎。" },
      { idiom: "一心一意", pinyin: "yī xīn yī yì", emoji: "❤️🎯🧠", en: "One heart, one mind — wholehearted and single-minded.", cn: "专心专意，没有别的念头。" },
      { idiom: "一字千金", pinyin: "yī zì qiān jīn", emoji: "🔤💰💯", en: "One word worth a thousand gold — superb writing.", cn: "文辞精妙，价值极高。" },
      { idiom: "三心二意", pinyin: "sān xīn èr yì", emoji: "3️⃣❤️😕", en: "Three hearts, two minds — half-hearted and undecided.", cn: "犹豫不定，不专心。" },
      { idiom: "七上八下", pinyin: "qī shàng bā xià", emoji: "7️⃣⬆️8️⃣⬇️", en: "Seven up, eight down — agitated and uneasy.", cn: "形容心神不定，慌乱不安。" },
      { idiom: "九死一生", pinyin: "jiǔ sǐ yī shēng", emoji: "9️⃣💀1️⃣", en: "Nine deaths, one life — a very narrow escape.", cn: "经历极大危险后侥幸活命。" },
      { idiom: "千钧一发", pinyin: "qiān jūn yī fà", emoji: "⚖️🧶⚠️", en: "A thousand pounds on one hair — extremely critical moment.", cn: "情况极其危急。" },
      { idiom: "万众一心", pinyin: "wàn zhòng yī xīn", emoji: "👥👥❤️", en: "Ten thousand as one heart — united as one.", cn: "大家团结一致。" },
      { idiom: "对症下药", pinyin: "duì zhèng xià yào", emoji: "🩺🎯💊", en: "Prescribe to fit the illness — tailor the solution to the problem.", cn: "针对问题采取有效办法。" },
      { idiom: "半途而废", pinyin: "bàn tú ér fèi", emoji: "🛤️🚶🛑", en: "Give up halfway — quit before finishing.", cn: "事情没做完就中途停止。" },
      { idiom: "锦上添花", pinyin: "jǐn shàng tiān huā", emoji: "🧵➕🌸", en: "Add flowers to brocade — make the good even better.", cn: "在美好的基础上再添美好。" },
      { idiom: "雪中送炭", pinyin: "xuě zhōng sòng tàn", emoji: "❄️🎁🔥", en: "Send charcoal in snow — help when help is most needed.", cn: "在别人困难时给予帮助。" },
      { idiom: "见义勇为", pinyin: "jiàn yì yǒng wéi", emoji: "👀⚖️💪", en: "Act bravely for justice — do right without hesitation.", cn: "看到正义的事勇敢去做。" },
      { idiom: "舍己为人", pinyin: "shě jǐ wèi rén", emoji: "🙋💝🧑", en: "Sacrifice self for others — selfless devotion.", cn: "牺牲自己去帮助别人。" },
      { idiom: "知恩图报", pinyin: "zhī ēn tú bào", emoji: "🙏💗↩️", en: "Know kindness and repay it — be grateful and return favors.", cn: "受人恩惠就想着报答。" },
      { idiom: "饮水思源", pinyin: "yǐn shuǐ sī yuán", emoji: "🥤💧🏞️", en: "Drink water, recall the source — never forget one's roots.", cn: "不忘本，记得恩惠来源。" },
      { idiom: "拾金不昧", pinyin: "shí jīn bù mèi", emoji: "💰🤲😇", en: "Pick up gold and not pocket it — honest about found valuables.", cn: "捡到钱财不据为己有。" },
      { idiom: "光明磊落", pinyin: "guāng míng lěi luò", emoji: "💡😇🌞", en: "Bright and upright — open and honorable in conduct.", cn: "胸怀坦白，正大光明。" },
      { idiom: "废寝忘食", pinyin: "fèi qǐn wàng shí", emoji: "🛌🚫🍚", en: "Forget sleep and meals — work with total dedication.", cn: "专心努力到顾不上吃睡。" },
      { idiom: "夜以继日", pinyin: "yè yǐ jì rì", emoji: "🌙➡️☀️", en: "Night continuing day — work around the clock.", cn: "日夜不停地干。" },
      { idiom: "争分夺秒", pinyin: "zhēng fēn duó miǎo", emoji: "⏱️🏃💨", en: "Fight for minutes and seconds — race against time.", cn: "抓紧每一点时间。" },
      { idiom: "全力以赴", pinyin: "quán lì yǐ fù", emoji: "💪🏃🔥", en: "Go with all one's might — give it everything.", cn: "用尽全部力量去做。" },
      { idiom: "持之以恒", pinyin: "chí zhī yǐ héng", emoji: "🤲⏳♾️", en: "Keep at it with constancy — persevere over time.", cn: "长久坚持，不间断。" },
      { idiom: "锲而不舍", pinyin: "qiè ér bù shě", emoji: "🪚✋♾️", en: "Keep carving without stopping — persist tirelessly.", cn: "坚持不懈，毫不放松。" },
      { idiom: "滴水穿石", pinyin: "dī shuǐ chuān shí", emoji: "💧⏳🪨", en: "Dripping water bores stone — persistence overcomes anything.", cn: "坚持不懈终能成功。" },
      { idiom: "聚沙成塔", pinyin: "jù shā chéng tǎ", emoji: "🏖️➕🗼", en: "Gather sand into a tower — small efforts add up.", cn: "积少成多，集小成大。" },
      { idiom: "积少成多", pinyin: "jī shǎo chéng duō", emoji: "➕🔢📈", en: "Accumulate few into many — bit by bit becomes a lot.", cn: "一点一点地积累就会变多。" },
      { idiom: "熟能生巧", pinyin: "shú néng shēng qiǎo", emoji: "🔁🛠️✨", en: "Practice breeds skill — mastery comes with repetition.", cn: "熟练了就能找到窍门。" },
      { idiom: "勤能补拙", pinyin: "qín néng bǔ zhuō", emoji: "💪🛠️🐢", en: "Diligence makes up for dullness — hard work beats talent gaps.", cn: "勤奋可以弥补笨拙。" },
      { idiom: "笨鸟先飞", pinyin: "bèn niǎo xiān fēi", emoji: "🐤🐌🛫", en: "The slow bird flies first — the less able start early.", cn: "能力差的人提前努力。" },
      { idiom: "温故知新", pinyin: "wēn gù zhī xīn", emoji: "📖🔁💡", en: "Review the old to learn the new — gain fresh insight from old knowledge.", cn: "复习旧知识获得新理解。" },
      { idiom: "学以致用", pinyin: "xué yǐ zhì yòng", emoji: "📚➡️🛠️", en: "Learn in order to apply — put knowledge to use.", cn: "把学到的运用到实际中。" },
      { idiom: "博学多才", pinyin: "bó xué duō cái", emoji: "📚🧠⭐", en: "Broadly learned and talented — knowledgeable and gifted.", cn: "学问广博，才能多样。" },
      { idiom: "才高八斗", pinyin: "cái gāo bā dǒu", emoji: "🧠📏8️⃣", en: "Talent of eight pecks — exceptionally gifted.", cn: "形容人极有才华。" },
      { idiom: "出类拔萃", pinyin: "chū lèi bá cuì", emoji: "🌟🆙🏆", en: "Stand out from the crowd — far above the rest.", cn: "才能超出同类之上。" },
      { idiom: "名列前茅", pinyin: "míng liè qián máo", emoji: "🏅📋🥇", en: "Ranked among the front — at the top of the list.", cn: "名次排在前面。" },
      { idiom: "脱颖而出", pinyin: "tuō yǐng ér chū", emoji: "🪡✨🆙", en: "The tip pokes through — talent shows itself.", cn: "才能完全显露出来。" },
      { idiom: "鹤立鸡群", pinyin: "hè lì jī qún", emoji: "🦢🐔🐔", en: "A crane among chickens — outstanding amid the ordinary.", cn: "一个人才能仪表超群。" },
      { idiom: "独一无二", pinyin: "dú yī wú èr", emoji: "1️⃣🚫2️⃣", en: "One and only — unique, without equal.", cn: "没有第二个，独特无比。" },
      { idiom: "举世闻名", pinyin: "jǔ shì wén míng", emoji: "🌍📢⭐", en: "Famous the world over — world-renowned.", cn: "全世界都知道，非常有名。" },
      { idiom: "名副其实", pinyin: "míng fù qí shí", emoji: "🏷️✅👌", en: "Name matches reality — living up to one's reputation.", cn: "名声与实际相符。" },
      { idiom: "实事求是", pinyin: "shí shì qiú shì", emoji: "📋🔍✅", en: "Seek truth from facts — be realistic and accurate.", cn: "按照实际情况办事。" },
      { idiom: "理所当然", pinyin: "lǐ suǒ dāng rán", emoji: "📖✅👌", en: "As reason dictates — naturally and rightly so.", cn: "按道理本来就应该这样。" },
      { idiom: "顺理成章", pinyin: "shùn lǐ chéng zhāng", emoji: "➡️📖✅", en: "Follow reason to form a text — logical and natural.", cn: "合乎情理，自然而然。" },
      { idiom: "水到渠成", pinyin: "shuǐ dào qú chéng", emoji: "💧➡️🪐", en: "Water arrives, the channel forms — success comes when ready.", cn: "条件成熟事情自然成功。" },
      { idiom: "瓜熟蒂落", pinyin: "guā shú dì luò", emoji: "🍈✅🍂", en: "Ripe melon drops from the vine — things happen in good time.", cn: "时机成熟事情自然完成。" },
      { idiom: "雨过天晴", pinyin: "yǔ guò tiān qíng", emoji: "🌧️➡️🌤️", en: "After rain, clear skies — hardship gives way to better days.", cn: "坏情况过去转向好转。" },
      { idiom: "苦尽甘来", pinyin: "kǔ jìn gān lái", emoji: "😣➡️😊", en: "Bitterness ends, sweetness comes — good follows hardship.", cn: "艰难过去，好日子到来。" },
      { idiom: "否极泰来", pinyin: "pǐ jí tài lái", emoji: "📉🔄📈", en: "Bad luck peaks, good fortune comes — fortunes turn around.", cn: "坏运到头就转为好运。" },
      { idiom: "柳暗花明", pinyin: "liǔ àn huā míng", emoji: "🌿🌸💡", en: "Dim willows, bright flowers — hope appears after difficulty.", cn: "困境中出现新的希望。" },
      { idiom: "绝处逢生", pinyin: "jué chù féng shēng", emoji: "🪦➡️🌱", en: "Find life in a dead end — survive against the odds.", cn: "在绝境中找到生路。" },
      { idiom: "化险为夷", pinyin: "huà xiǎn wéi yí", emoji: "⚠️🔄😌", en: "Turn danger into safety — avert a crisis.", cn: "把危险转化为平安。" },
      { idiom: "转危为安", pinyin: "zhuǎn wēi wéi ān", emoji: "⚠️🔄🛡️", en: "Turn peril into peace — bring things back to safety.", cn: "从危险转变为安全。" },
      { idiom: "九霄云外", pinyin: "jiǔ xiāo yún wài", emoji: "9️⃣☁️🚀", en: "Beyond the ninth heaven — far away and forgotten.", cn: "形容抛得极远，无影无踪。" },
      { idiom: "气象万千", pinyin: "qì xiàng wàn qiān", emoji: "🌈🏞️✨", en: "A myriad of grand scenes — magnificent and varied.", cn: "景象壮丽，变化多样。" },
      { idiom: "波澜壮阔", pinyin: "bō lán zhuàng kuò", emoji: "🌊💪🌅", en: "Vast surging waves — grand and majestic in scale.", cn: "场面或声势浩大雄壮。" },
      { idiom: "气势磅礴", pinyin: "qì shì páng bó", emoji: "💨🏔️💪", en: "Of imposing momentum — grand and powerful.", cn: "气势雄伟，盛大有力。" },
      { idiom: "山清水秀", pinyin: "shān qīng shuǐ xiù", emoji: "⛰️💧🌿", en: "Clear hills, lovely waters — beautiful scenery.", cn: "山水风景优美。" },
      { idiom: "鸟语花香", pinyin: "niǎo yǔ huā xiāng", emoji: "🐦🎵🌸", en: "Birdsong and flower scent — a lovely spring scene.", cn: "形容春天美好的景象。" },
      { idiom: "春暖花开", pinyin: "chūn nuǎn huā kāi", emoji: "🌸🌡️🌼", en: "Warm spring, blooming flowers — a fine, hopeful season.", cn: "春天气候温暖花儿开放。" },
      { idiom: "万紫千红", pinyin: "wàn zǐ qiān hóng", emoji: "🟣🔴🌷", en: "Ten thousand purples, a thousand reds — a riot of color.", cn: "形容百花齐放，色彩繁多。" },
      { idiom: "五彩缤纷", pinyin: "wǔ cǎi bīn fēn", emoji: "🌈🎨✨", en: "Five colors in profusion — bright and varied colors.", cn: "颜色繁多而美丽。" },
      { idiom: "金碧辉煌", pinyin: "jīn bì huī huáng", emoji: "🥇💎✨", en: "Gold and jade splendor — magnificent and resplendent.", cn: "建筑等极其华丽辉煌。" },
      { idiom: "美轮美奂", pinyin: "měi lún měi huàn", emoji: "🏛️✨😍", en: "Splendid and grand — beautifully magnificent buildings.", cn: "房屋高大华美众多。" },
      { idiom: "栩栩如生", pinyin: "xǔ xǔ rú shēng", emoji: "🖼️🎨💫", en: "Vivid as life — lifelike and vivid.", cn: "形象逼真，像活的一样。" },
      { idiom: "惟妙惟肖", pinyin: "wéi miào wéi xiào", emoji: "🎭🪞✨", en: "Marvelously alike — an excellent, faithful likeness.", cn: "描摹得非常逼真。" },
      { idiom: "活灵活现", pinyin: "huó líng huó xiàn", emoji: "✨👻💫", en: "Vividly alive — described so vividly it seems real.", cn: "描述生动逼真。" },
      { idiom: "绘声绘色", pinyin: "huì shēng huì sè", emoji: "🗣️🎨👂", en: "Paint sound and color — describe vividly and engagingly.", cn: "叙述描写得生动逼真。" },
      { idiom: "引人入胜", pinyin: "yǐn rén rù shèng", emoji: "🧲📖😍", en: "Lure people into wonder — fascinating and absorbing.", cn: "吸引人进入美妙境界。" },
      { idiom: "扣人心弦", pinyin: "kòu rén xīn xián", emoji: "🎻❤️😮", en: "Pluck the heartstrings — deeply moving and gripping.", cn: "形容动人心，使人激动。" },
      { idiom: "脍炙人口", pinyin: "kuài zhì rén kǒu", emoji: "🍖😋👄", en: "Savory to every mouth — widely loved and praised.", cn: "好的诗文人人传诵。" },
      { idiom: "雅俗共赏", pinyin: "yǎ sú gòng shǎng", emoji: "🎩🧢😊", en: "Enjoyed by refined and common alike — appeals to all.", cn: "文化高低的人都能欣赏。" },
      { idiom: "妙趣横生", pinyin: "miào qù héng shēng", emoji: "✨😄💡", en: "Brimming with wit and charm — full of delightful interest.", cn: "洋溢着美妙的情趣。" },
      { idiom: "妙笔生花", pinyin: "miào bǐ shēng huā", emoji: "🖋️✨🌸", en: "A magic brush grows flowers — brilliant writing.", cn: "文笔高超，写得精彩。" },
      { idiom: "出口成章", pinyin: "chū kǒu chéng zhāng", emoji: "👄📜✨", en: "Words form essays as spoken — eloquent and articulate.", cn: "说话有文采，很有条理。" },
      { idiom: "对答如流", pinyin: "duì dá rú liú", emoji: "💬🌊✅", en: "Answer like flowing water — reply fluently and readily.", cn: "回答问题流利顺畅。" },
      { idiom: "滔滔不绝", pinyin: "tāo tāo bù jué", emoji: "🌊🗣️♾️", en: "Flow on without end — talk on and on endlessly.", cn: "说话连续不断。" },
      { idiom: "口若悬河", pinyin: "kǒu ruò xuán hé", emoji: "👄🌊⛰️", en: "Mouth like a rushing river — extremely eloquent.", cn: "说话滔滔不绝，能言善辩。" },
      { idiom: "能言善辩", pinyin: "néng yán shàn biàn", emoji: "🗣️🧠⚖️", en: "Skilled in speech and debate — articulate and persuasive.", cn: "很会说话，善于辩论。" },
      { idiom: "巧舌如簧", pinyin: "qiǎo shé rú huáng", emoji: "👅🎵🪈", en: "A glib tongue like a reed — smooth, persuasive talk.", cn: "花言巧语，能说会道。" },
      { idiom: "花言巧语", pinyin: "huā yán qiǎo yǔ", emoji: "🌸🗣️🎭", en: "Flowery, cunning words — sweet talk meant to deceive.", cn: "用动听虚假的话骗人。" },
      { idiom: "甜言蜜语", pinyin: "tián yán mì yǔ", emoji: "🍬🗣️🍯", en: "Sweet, honeyed words — flattering, pleasing speech.", cn: "为讨好而说的动听话。" },
      { idiom: "言而无信", pinyin: "yán ér wú xìn", emoji: "🗣️🚫🤝", en: "Speak without trust — break one's promises.", cn: "说话不讲信用。" },
      { idiom: "出尔反尔", pinyin: "chū ěr fǎn ěr", emoji: "🔄🗣️❌", en: "Go back on one's words — be inconsistent and unreliable.", cn: "言行前后矛盾，反复无常。" },
      { idiom: "言行一致", pinyin: "yán xíng yī zhì", emoji: "🗣️🤝🚶", en: "Words match deeds — consistent in speech and action.", cn: "说的和做的相符合。" },
      { idiom: "言行不一", pinyin: "yán xíng bù yī", emoji: "🗣️❌🚶", en: "Words and deeds disagree — say one thing, do another.", cn: "说的和做的不一样。" },
      { idiom: "表里如一", pinyin: "biǎo lǐ rú yī", emoji: "👕✅❤️", en: "Outside matches inside — sincere, no pretense.", cn: "外表和内心一个样。" },
      { idiom: "表里不一", pinyin: "biǎo lǐ bù yī", emoji: "👕❌❤️", en: "Outside differs from inside — two-faced.", cn: "外表和内心不一致。" },
      { idiom: "口是心非", pinyin: "kǒu shì xīn fēi", emoji: "👄✅💔", en: "Mouth yes, heart no — say one thing, mean another.", cn: "嘴上说的和心里想的不一样。" },
      { idiom: "言不由衷", pinyin: "yán bù yóu zhōng", emoji: "🗣️🚫❤️", en: "Words not from the heart — insincere talk.", cn: "说的话不是真心的。" },
      { idiom: "心口如一", pinyin: "xīn kǒu rú yī", emoji: "❤️✅👄", en: "Heart and mouth as one — sincere and honest.", cn: "心里想的和嘴上说的一致。" },
      { idiom: "言简意赅", pinyin: "yán jiǎn yì gāi", emoji: "🗣️✂️💯", en: "Few words, full meaning — concise yet complete.", cn: "语言简洁而意思完备。" },
      { idiom: "言外之意", pinyin: "yán wài zhī yì", emoji: "🗣️➡️💭", en: "Meaning beyond words — the implied sense.", cn: "话里暗含的意思。" },
      { idiom: "意味深长", pinyin: "yì wèi shēn cháng", emoji: "💭🌊📏", en: "Deep and lingering meaning — full of profound implication.", cn: "含义深刻，耐人寻味。" },
      { idiom: "耐人寻味", pinyin: "nài rén xún wèi", emoji: "🤔🔍💭", en: "Worth pondering — thought-provoking.", cn: "意味深长，值得仔细体会。" },
      { idiom: "发人深省", pinyin: "fā rén shēn xǐng", emoji: "💡🤔❗", en: "Set one deeply thinking — thought-provoking and instructive.", cn: "启发人深刻思考醒悟。" },
      { idiom: "茅塞顿开", pinyin: "máo sè dùn kāi", emoji: "🌿🚪💡", en: "Blocked weeds suddenly clear — sudden enlightenment.", cn: "一下子明白过来。" },
      { idiom: "恍然大悟", pinyin: "huǎng rán dà wù", emoji: "😯💡✨", en: "Suddenly fully understand — a flash of realization.", cn: "猛然间完全明白了。" },
      { idiom: "豁然开朗", pinyin: "huò rán kāi lǎng", emoji: "🌫️➡️🌞", en: "Suddenly open and bright — a sudden clear understanding.", cn: "由困惑变得明白开阔。" },
      { idiom: "举一反三", pinyin: "jǔ yī fǎn sān", emoji: "1️⃣➡️3️⃣", en: "From one, infer three — draw broad conclusions from one case.", cn: "由一件事类推出许多。" },
      { idiom: "触类旁通", pinyin: "chù lèi páng tōng", emoji: "🔗🔄💡", en: "Grasp one, master related — extend knowledge by analogy.", cn: "掌握一类就懂得同类。" },
      { idiom: "融会贯通", pinyin: "róng huì guàn tōng", emoji: "🔀🧠💯", en: "Blend and master thoroughly — integrate knowledge fully.", cn: "把各方面知识融合贯穿理解。" },
      { idiom: "博览群书", pinyin: "bó lǎn qún shū", emoji: "📚👀🗂️", en: "Read widely across many books — extensively read.", cn: "广泛地阅读各种书籍。" },
      { idiom: "学富五车", pinyin: "xué fù wǔ chē", emoji: "📚🚛5️⃣", en: "Learning fills five carts — vastly erudite.", cn: "形容读书多，学问大。" },
      { idiom: "满腹经纶", pinyin: "mǎn fù jīng lún", emoji: "🧠📜💯", en: "A belly full of statecraft — full of knowledge and ability.", cn: "很有学问和治理才能。" },
      { idiom: "学而不厌", pinyin: "xué ér bù yàn", emoji: "📚♾️😊", en: "Study without tiring — never weary of learning.", cn: "学习总不感到满足。" },
      { idiom: "诲人不倦", pinyin: "huì rén bù juàn", emoji: "🧑‍🏫♾️😊", en: "Teach without weariness — tirelessly instruct others.", cn: "教导别人不知疲倦。" },
      { idiom: "循循善诱", pinyin: "xún xún shàn yòu", emoji: "🧑‍🏫🪜👍", en: "Guide step by step skillfully — teach patiently and well.", cn: "善于有步骤地引导教育。" },
      { idiom: "因材施教", pinyin: "yīn cái shī jiào", emoji: "🧑‍🎓🔀📚", en: "Teach according to ability — adapt teaching to the learner.", cn: "针对学生特点进行教育。" },
      { idiom: "教学相长", pinyin: "jiào xué xiāng zhǎng", emoji: "🧑‍🏫🔄🧑‍🎓", en: "Teaching and learning grow together — both improve mutually.", cn: "教和学互相促进提高。" },
      { idiom: "废话连篇", pinyin: "fèi huà lián piān", emoji: "🗑️🗣️📄", en: "Pages of nonsense — full of useless talk.", cn: "文章或讲话空话很多。" },
      { idiom: "夸夸其谈", pinyin: "kuā kuā qí tán", emoji: "🗣️💨🎈", en: "Talk big and boastfully — empty, exaggerated talk.", cn: "说话浮夸不切实际。" },
      { idiom: "言过其实", pinyin: "yán guò qí shí", emoji: "🗣️📈❌", en: "Words exceed the facts — exaggerated beyond truth.", cn: "说话超过实际情况。" },
      { idiom: "名不副实", pinyin: "míng bù fù shí", emoji: "🏷️❌✅", en: "Name not matching reality — undeserved reputation.", cn: "名声和实际不相符。" },
      { idiom: "徒有虚名", pinyin: "tú yǒu xū míng", emoji: "🏷️💨❌", en: "Only an empty name — fame without substance.", cn: "空有名声，没有实际本领。" },
      { idiom: "名不虚传", pinyin: "míng bù xū chuán", emoji: "🏷️✅👍", en: "The fame is not falsely spread — truly deserves its reputation.", cn: "名声与实际相符，确实好。" },
      { idiom: "众所周知", pinyin: "zhòng suǒ zhōu zhī", emoji: "👥🌍💡", en: "Known to all — common knowledge.", cn: "大家都知道。" },
      { idiom: "家喻户晓", pinyin: "jiā yù hù xiǎo", emoji: "🏠📢🏘️", en: "Known in every household — universally known.", cn: "每家每户都知道。" },
      { idiom: "鼎鼎大名", pinyin: "dǐng dǐng dà míng", emoji: "🏆⭐📢", en: "A resounding great name — highly renowned.", cn: "名气非常大。" },
      { idiom: "默默无闻", pinyin: "mò mò wú wén", emoji: "🤫🚫📢", en: "Silent and unknown — obscure, without fame.", cn: "不出名，无人知晓。" },
      { idiom: "无人问津", pinyin: "wú rén wèn jīn", emoji: "🚫🧑❓", en: "No one asks the ford — ignored, of no interest.", cn: "没有人来探问或尝试。" },
      { idiom: "门可罗雀", pinyin: "mén kě luó què", emoji: "🚪🕸️🐦", en: "Nets for sparrows at the door — deserted, no visitors.", cn: "门前冷落，来客极少。" },
      { idiom: "门庭若市", pinyin: "mén tíng ruò shì", emoji: "🚪👥🛒", en: "A gate busy as a market — crowded with visitors.", cn: "来往的人很多，非常热闹。" },
      { idiom: "车水马龙", pinyin: "chē shuǐ mǎ lóng", emoji: "🚗🌊🐉", en: "Carriages like water, horses like dragons — bustling traffic.", cn: "车马往来不绝，繁华热闹。" },
      { idiom: "人山人海", pinyin: "rén shān rén hǎi", emoji: "🧑⛰️🌊", en: "Mountains and seas of people — an enormous crowd.", cn: "聚集的人极多。" },
      { idiom: "络绎不绝", pinyin: "luò yì bù jué", emoji: "🚶🚶♾️", en: "Coming and going without break — a steady, endless stream.", cn: "人马车船连续不断。" },
      { idiom: "热闹非凡", pinyin: "rè nào fēi fán", emoji: "🎉👥🎊", en: "Extraordinarily lively — bustling and festive.", cn: "非常热闹，气氛活跃。" },
      { idiom: "张灯结彩", pinyin: "zhāng dēng jié cǎi", emoji: "🏮🎀🎊", en: "Hang lanterns and streamers — festively decorated.", cn: "挂上灯笼彩带庆祝。" },
      { idiom: "普天同庆", pinyin: "pǔ tiān tóng qìng", emoji: "🌍🎉🎈", en: "All under heaven celebrate together — universal rejoicing.", cn: "天下的人共同庆祝。" },
      { idiom: "喜气洋洋", pinyin: "xǐ qì yáng yáng", emoji: "😊🎉✨", en: "Brimming with joy — full of happiness.", cn: "充满欢喜的气氛。" },
      { idiom: "兴高采烈", pinyin: "xìng gāo cǎi liè", emoji: "🤩🎉🙌", en: "High spirits, dazzling cheer — joyful and elated.", cn: "兴致高，情绪热烈。" },
      { idiom: "眉开眼笑", pinyin: "méi kāi yǎn xiào", emoji: "😄👀😊", en: "Brows lift, eyes smile — beaming with delight.", cn: "高兴得满脸笑容。" },
      { idiom: "喜出望外", pinyin: "xǐ chū wàng wài", emoji: "😲😄🎁", en: "Joy beyond expectation — pleasantly surprised.", cn: "遇到意外好事而特别高兴。" },
      { idiom: "心花怒放", pinyin: "xīn huā nù fàng", emoji: "❤️🌸💥", en: "The heart's flowers burst open — overjoyed.", cn: "心里高兴得像花儿盛开。" },
      { idiom: "欢天喜地", pinyin: "huān tiān xǐ dì", emoji: "🎉🌍😄", en: "Joyous heaven and earth — extremely happy.", cn: "形容非常欢喜。" },
      { idiom: "手舞足蹈", pinyin: "shǒu wǔ zú dǎo", emoji: "🙌💃🦶", en: "Hands dance, feet stamp — dancing with joy.", cn: "高兴得又跳又舞。" },
      { idiom: "悲痛欲绝", pinyin: "bēi tòng yù jué", emoji: "😭💔🥀", en: "Grief to the point of fainting — overwhelmed by sorrow.", cn: "伤心到了极点。" },
      { idiom: "痛哭流涕", pinyin: "tòng kū liú tì", emoji: "😭💧😢", en: "Weep bitterly with running tears — cry one's heart out.", cn: "非常伤心地大哭。" },
      { idiom: "泪流满面", pinyin: "lèi liú mǎn miàn", emoji: "😭💧😩", en: "Tears streaming down the face — weeping profusely.", cn: "眼泪流满整个脸。" },
      { idiom: "愁眉苦脸", pinyin: "chóu méi kǔ liǎn", emoji: "😟😣😞", en: "Knit brows, bitter face — a worried, miserable look.", cn: "形容忧愁苦恼的样子。" },
      { idiom: "唉声叹气", pinyin: "āi shēng tàn qì", emoji: "😮‍💨😔💨", en: "Sighs and groans — sighing in distress.", cn: "因苦闷而不停叹气。" },
      { idiom: "垂头丧气", pinyin: "chuí tóu sàng qì", emoji: "😞⬇️💨", en: "Drooping head, lost spirit — dejected and dispirited.", cn: "情绪低落，无精打采。" },
      { idiom: "心灰意冷", pinyin: "xīn huī yì lěng", emoji: "❤️🩶🥶", en: "Ashen heart, cold spirit — disheartened.", cn: "灰心失望，意志消沉。" },
      { idiom: "灰心丧气", pinyin: "huī xīn sàng qì", emoji: "🩶❤️💨", en: "Gray heart, lost spirit — discouraged and dejected.", cn: "因失败而失去信心。" },
      { idiom: "心烦意乱", pinyin: "xīn fán yì luàn", emoji: "😖🧠🌀", en: "Vexed heart, scattered mind — agitated and confused.", cn: "心情烦躁，思绪混乱。" },
      { idiom: "忐忑不安", pinyin: "tǎn tè bù ān", emoji: "😰💓😟", en: "Up and down, ill at ease — nervous and anxious.", cn: "心神不定，非常不安。" },
      { idiom: "提心吊胆", pinyin: "tí xīn diào dǎn", emoji: "😨❤️😬", en: "Heart raised, gall hung — fearful and on edge.", cn: "形容十分担心害怕。" },
      { idiom: "胆战心惊", pinyin: "dǎn zhàn xīn jīng", emoji: "😱💓😨", en: "Trembling gall, startled heart — terrified.", cn: "形容非常害怕。" },
      { idiom: "魂飞魄散", pinyin: "hún fēi pò sàn", emoji: "👻💨😱", en: "Soul flies, spirit scatters — scared out of one's wits.", cn: "吓得魂魄都没有了。" },
      { idiom: "面如土色", pinyin: "miàn rú tǔ sè", emoji: "😨🟤👤", en: "Face the color of earth — pale with fear.", cn: "脸色灰白，十分惊恐。" },
      { idiom: "目瞪口呆", pinyin: "mù dèng kǒu dāi", emoji: "😦👀😶", en: "Eyes staring, mouth agape — stunned and dumbfounded.", cn: "受惊或发愣而呆住。" },
      { idiom: "瞠目结舌", pinyin: "chēng mù jié shé", emoji: "😳👀👅", en: "Staring eyes, tied tongue — speechless with shock.", cn: "因吃惊而说不出话。" },
      { idiom: "哑口无言", pinyin: "yǎ kǒu wú yán", emoji: "🤐🚫🗣️", en: "Mute mouth, no words — left speechless.", cn: "理屈或惊讶得说不出话。" },
      { idiom: "理直气壮", pinyin: "lǐ zhí qì zhuàng", emoji: "⚖️✅💪", en: "Right in reason, bold in spirit — confident with justice.", cn: "理由充分，说话有气势。" },
      { idiom: "义正词严", pinyin: "yì zhèng cí yán", emoji: "⚖️📢😠", en: "Just in cause, stern in words — righteously firm.", cn: "理由正当，措辞严厉。" },
      { idiom: "据理力争", pinyin: "jù lǐ lì zhēng", emoji: "📖💪🗣️", en: "Argue firmly on principle — stand one's ground with reason.", cn: "依据道理极力争辩。" },
      { idiom: "无理取闹", pinyin: "wú lǐ qǔ nào", emoji: "🚫⚖️😤", en: "Make a fuss without reason — cause trouble unreasonably.", cn: "毫无理由地吵闹捣乱。" },
      { idiom: "蛮不讲理", pinyin: "mán bù jiǎng lǐ", emoji: "😤🚫⚖️", en: "Rude and unreasonable — refusing to listen to reason.", cn: "态度粗暴，不讲道理。" },
      { idiom: "强词夺理", pinyin: "qiǎng cí duó lǐ", emoji: "🗣️💪⚖️", en: "Force words to seize reason — argue with sophistry.", cn: "无理强辩，硬说有理。" },
    ];

    const opts = api.config.options;
    const TOTAL = Math.min(opts.rounds, DATA.length);
    const NCHOICES = opts.choices;
    const lang = (window.I18n && I18n.lang) || "en";
    const zh = lang === "zh";
    const meaningOf = (e) => (zh ? e.cn : e.en);

    function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }

    const list = shuffle(DATA).slice(0, TOTAL);
    let idx = 0, score = 0, solved = 0;
    let cur, attempts, hintUsed, done;

    // ---- layout ----
    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:14px;width:100%;max-width:520px;padding:6px";

    const clue = api.el("div", "");
    clue.style.cssText = "font-size:46px;line-height:1.25;text-align:center;min-height:58px;letter-spacing:4px";

    const boxes = api.el("div", "");
    boxes.style.cssText = "display:flex;gap:8px;justify-content:center";
    const boxEls = [];
    for (let i = 0; i < 4; i++) {
      const b = api.el("div", "");
      b.style.cssText = "width:52px;height:52px;border:2px solid var(--mint-300);border-radius:10px;display:grid;place-items:center;font-size:30px;font-weight:800;color:var(--ink);background:#fff";
      boxEls.push(b); boxes.appendChild(b);
    }

    const pinyin = api.el("div", "");
    pinyin.style.cssText = "font-size:15px;color:var(--ink-soft);min-height:20px;font-style:italic;text-align:center;max-width:480px";

    const optWrap = api.el("div", "");
    optWrap.style.cssText = "display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;width:100%;max-width:440px";

    const tools = api.el("div", "");
    tools.style.cssText = "display:flex;gap:10px;flex-wrap:wrap;justify-content:center";
    const hintBtn = api.el("button", "btn ghost", "💡 " + (zh ? "提示" : "Hint"));
    const nextBtn = api.el("button", "btn primary", (zh ? "下一题 ▶" : "Next ▶"));
    tools.appendChild(hintBtn); tools.appendChild(nextBtn);

    wrap.appendChild(clue);
    wrap.appendChild(boxes);
    wrap.appendChild(pinyin);
    wrap.appendChild(optWrap);
    wrap.appendChild(tools);
    api.board.appendChild(wrap);

    hintBtn.addEventListener("click", useHint);
    nextBtn.addEventListener("click", next);

    function setScore() {
      api.setScores([
        { name: api.config.username, value: score, color: "#2e9d6c" },
        { name: zh ? "回合" : "Round", value: Math.min(idx + 1, TOTAL) + "/" + TOTAL, color: "#3498db" },
        { name: zh ? "答对" : "Solved", value: solved, color: "#e67e22" },
      ]);
    }

    function reveal() {
      const chars = cur.idiom.split("");
      boxEls.forEach((b, i) => { b.textContent = chars[i] || ""; b.style.background = "var(--mint-100)"; });
      pinyin.textContent = cur.pinyin + " · " + meaningOf(cur);
    }

    function endRound() {
      done = true;
      [...optWrap.children].forEach((b) => (b.disabled = true));
      reveal();
      nextBtn.style.display = "";
      nextBtn.textContent = (idx + 1 >= TOTAL) ? (zh ? "完成 🎉" : "Finish 🎉") : (zh ? "下一题 ▶" : "Next ▶");
      hintBtn.disabled = true; hintBtn.style.opacity = "0.5";
    }

    function guess(ch, btn) {
      if (done) return;
      if (ch.idiom === cur.idiom) {
        btn.style.background = "#aee3c8"; btn.style.borderColor = "var(--mint-500)";
        let pts = 100 - (3 - attempts) * 30 - (hintUsed ? 40 : 0);
        if (pts < 10) pts = 10;
        score += pts; solved++;
        api.setStatus((zh ? "✅ 答对！+" : "✅ Correct! +") + pts + "  ·  " + cur.idiom + " (" + cur.pinyin + ")");
        endRound();
      } else {
        btn.style.background = "#f3a79f"; btn.style.borderColor = "#e74c3c"; btn.disabled = true;
        attempts--;
        hintBtn.disabled = false; hintBtn.style.opacity = "1";
        if (attempts <= 0) {
          api.setStatus((zh ? "❌ 机会用完！答案是 " : "❌ Out of tries! The answer was ") + cur.idiom + " (" + cur.pinyin + ")");
          endRound();
        } else {
          api.setStatus((zh ? "再试试！还剩 " + attempts + " 次。点 💡 看提示。" : "Try again! " + attempts + " tries left. Tap 💡 for a hint."));
        }
      }
      setScore();
    }

    function useHint() {
      if (done || hintUsed || hintBtn.disabled) return;
      hintUsed = true; hintBtn.disabled = true; hintBtn.style.opacity = "0.5";
      // show only the meaning — never the pinyin, which would spell out the answer
      pinyin.textContent = meaningOf(cur);
      api.setStatus("💡 " + (zh ? "提示：" : "Hint: ") + meaningOf(cur));
    }

    function loadRound() {
      cur = list[idx]; attempts = 3; hintUsed = false; done = false;
      clue.textContent = cur.emoji;
      boxEls.forEach((b) => { b.textContent = "❓"; b.style.background = "#fff"; b.style.borderColor = "var(--mint-300)"; b.style.color = "var(--ink)"; });
      pinyin.textContent = "";
      const distract = shuffle(DATA.filter((d) => d.idiom !== cur.idiom)).slice(0, NCHOICES - 1);
      const choices = shuffle(distract.concat(cur));
      optWrap.innerHTML = "";
      choices.forEach((ch) => {
        const b = api.el("button", "btn ghost", ch.idiom);
        b.style.cssText += ";font-size:22px;font-weight:800;letter-spacing:3px;padding:14px 8px;min-height:54px";
        b.addEventListener("click", () => guess(ch, b));
        optWrap.appendChild(b);
      });
      hintBtn.disabled = true; hintBtn.style.opacity = "0.5";
      nextBtn.style.display = "none";
      api.setStatus(zh ? "看表情符号猜成语 — 你有 3 次机会 🀄" : "Guess the idiom from the emoji — you have 3 tries 🀄");
      setScore();
    }

    function next() {
      if (idx + 1 >= TOTAL) {
        [...optWrap.children].forEach((b) => (b.disabled = true));
        nextBtn.style.display = "none";
        if (api.submitScore) api.submitScore(solved); // bank idioms-solved count; highest in one game ranks top
        api.setStatus((zh ? "🎉 全部完成！得分 " : "🎉 All done! Final score ") + "<b>" + score + "</b> — " +
          (zh ? "答对 " : "solved ") + solved + "/" + TOTAL + ". " + (zh ? "按重新开始再玩一次。" : "Hit Restart to play again."));
        setScore();
        return;
      }
      idx++; loadRound();
    }

    loadRound();
    return { stop() {} };
  },
});
