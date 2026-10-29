// 像素精灵：用字符网格 + 调色板生成离屏画布
(function () {
  function make(rows, pal) {
    const h = rows.length;
    // 各行宽度不必一致：取最长的一行，短行右侧当作留白
    let w = 0;
    for (const r of rows) if (r.length > w) w = r.length;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let i = 0; i < w; i++) {
        const ch = row[i];
        const col = pal[ch];
        if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); }
      }
    }
    return c;
  }

  const K = '#1b1b2a'; // 通用描边

  const DEFS = [
    { name: 'hanli', pal: { K, H: '#2a2a36', S: '#e9bd97', G: '#3e8e4f', g: '#27613a' }, rows: [
      '....KKKK....', '...KHHHHK...', '..KHHHHHHK..', '..KSSSSSSK..', '..KSKSSKSK..',
      '...KSSSSK...', '..KGGGGGGK..', '.KGgGGGGgGK.', '.KGgGGGGgGK.', '..KgGGGGgK..',
      '..KGGKKGGK..', '..KGK..KGK..', '..KGK..KGK..', '..KKK..KKK..'
    ] },
    { name: 'wolf', pal: { K, W: '#9aa0ad', R: '#cf3b3b' }, rows: [
      'K...........', 'KWRK........', 'KWWRKKKKK...', 'KWWWWWWWWK..', 'KWKWWWWWWK..',
      '.K.KWWWWWK..', '..KWWK.KWK..', '..KWK..KWK..', '..KK....KK..'
    ] },
    { name: 'snake', pal: { K, G: '#5fae5f' }, rows: [
      'GGGGG.....', 'GGGGGGG...', '.GGGGGGGG.', '..GGGGGGGG', '.GGG..GGG.', '..G....G..', '.K......K.'
    ] },
    { name: 'bat', pal: { K, P: '#9a5fb0' }, rows: [
      'K....KK....K', 'KK..KKKK..KK', '.KKKKKKKKKK.', '..KKPPPPKK..', '...KP..PK...', '....K..K....', '............'
    ] },
    { name: 'boar', pal: { K, B: '#8a5a3b', b: '#5e3c25' }, rows: [
      '....KKKK....', '..KBBBBBBK..', '.KBBBBBBBBK.', 'KBBBBBBBBBBK', 'KBbBBBBBBBbK',
      'K.BBBBBBBB.K', '..KBBBBBBK..', '..KBK.KBK...', '..KBK.KBK...', '..KK...KK...'
    ] },
    { name: 'bandit', pal: { K, H: '#2a2a36', S: '#e9bd97', d: '#6e5a3f', B: '#8a5a3b', b: '#5e3c25' }, rows: [
      '....KKKK....', '...KHHHHK...', '..KHHHHHHK..', '..KSSSSSSK..', '..KSKSSKSK..',
      '...KSSSSK...', '..KddddddK..', '.KdBBBBBBdK.', '.KdBbBBbBdK.', '..KdBBBBdK..',
      '..KddKKddK..', '..KdK..KdK..', '..KdK..KdK..', '..KKK..KKK..'
    ] },
    { name: 'assassin', pal: { K, H: '#15151f', S: '#e9bd97', d: '#23232e', B: '#15151f', b: '#0e0e14' }, rows: [
      '....KKKK....', '...KHHHHK...', '..KHHHHHHK..', '..KSSSSSSK..', '..KSKSSKSK..',
      '...KSSSSK...', '..KddddddK..', '.KdBBBBBBdK.', '.KdBbBBbBdK.', '..KdBBBBdK..',
      '..KddKKddK..', '..KdK..KdK..', '..KdK..KdK..', '..KKK..KKK..'
    ] },
    { name: 'ghoul', pal: { K, Z: '#aebf9a', z: '#7a8a66', g: '#6a8a5a' }, rows: [
      '....KKKK....', '...KZZZZK...', '..KZZZZZZK..', '..KZKKZZKZK.', '..KZZZZZZK..',
      '...KZzzZK...', '..KZZZZZZK..', '.KZgZZZZgZK.', '..KZZZZZZK..', '..KZK..KZK..',
      '..KZK..KZK..', '..KKK..KKK..', '............'
    ] },
    { name: 'blacklord', pal: { K, H: '#2a2a36', S: '#e9bd97', R: '#b03a3a', r: '#7a2020' }, rows: [
      '....KKKKKK....', '...KHHHHHHK...', '..KHHHHHHHHK..', '..KHSSSSSSHK..', '...KSSSSSSK...',
      '..KRRRRRRRRK..', '.KRRRRRRRRRRK.', '.KRrRRRRRrRRK.', '.KRRRRRRRRRRK.', '..KRRRRRRRRK..',
      '..KRKRRRRKRK..', '..KRK..KRK...', '..KRK..KRK...', '..KKK..KKK...', '............', '............'
    ] },
    { name: 'mo', pal: { K, H: '#d8d8e0', S: '#e9bd97', G: '#8a93a3', g: '#5a6478' }, rows: [
      '......KKKK......', '.....KHHHHK.....', '....KHHHHHHK....', '....KSSSSSSK....', '....KSKSKSKS....',
      '.....KSSSSK.....', '....KGGGGGGK....', '...KGGGGGGGGK...', '..KGGGGGGGGGGK..', '..KGgGGGGGGgGK..',
      '..KGGGGGGGGGGK..', '..KGGGGGGGGGGK..', '...KGGGGGGGGK...', '...KGKGGGGKGK...', '...KGK.GG.KGK...', '...KKK....KKK...'
    ] },
    // ---- 际遇人物 / 支线景物 ----
    { name: 'hermit', pal: { K, H: '#dfe2e6', S: '#d8b48f', G: '#7a7466', g: '#57523f' }, rows: [
      '....KKKK....', '...KHHHHK...', '..KHHHHHHK..', '..KSSSSSSK..', '..KSKSSKSK..',
      '...KSSSSK...', '..KGGGGGGK..', '.KGgGGGGgGK.', '.KGgGGGGgGK.', '..KgGGGGgK..',
      '..KGGKKGGK..', '..KGK..KGK..', '..KGK..KGK..', '..KKK..KKK..'
    ] },
    { name: 'disciple', pal: { K, H: '#2a2a36', S: '#e9bd97', G: '#3f6fa8', g: '#2b4d78' }, rows: [
      '....KKKK....', '...KHHHHK...', '..KHHHHHHK..', '..KSSSSSSK..', '..KSKSSKSK..',
      '...KSSSSK...', '..KGGGGGGK..', '.KGgGGGGgGK.', '.KGgGGGGgGK.', '..KgGGGGgK..',
      '..KGGKKGGK..', '..KGK..KGK..', '..KGK..KGK..', '..KKK..KKK..'
    ] },
    { name: 'rogue', pal: { K, H: '#22201c', S: '#d9b28c', G: '#6b5533', g: '#4a3a22' }, rows: [
      '....KKKK....', '...KHHHHK...', '..KHHHHHHK..', '..KSSSSSSK..', '..KSKSSKSK..',
      '...KSSSSK...', '..KGGGGGGK..', '.KGgGGGGgGK.', '.KGgGGGGgGK.', '..KgGGGGgK..',
      '..KGGKKGGK..', '..KGK..KGK..', '..KGK..KGK..', '..KKK..KKK..'
    ] },
    { name: 'grave', pal: { K, b: '#7a5a3b', s: '#5f5548' }, rows: [
      '..........', '.....K....', '....KbK...', '....KbK...', '..KKKKKK..',
      '.KssssssK.', 'KssssssssK', '.KssssssK.', '..KKKKKK..'
    ] },
    { name: 'bag', pal: { K, b: '#8a6a3a', B: '#6b5230' }, rows: [
      '..........', '...KKKK...', '..KbbbbK..', '.KbBBBBbK.', '.KBBBBBBK.',
      '.KBBBBBBK.', '..KBBBBK..', '...KKKK...'
    ] },
    { name: 'shigui', pal: { K, s: '#6d7078', S: '#8f949e' }, rows: [
      '..............', '....KKKKKK....', '...KssssssK...', '..KssSSssssK..',
      '..KsKKssKKsK..', '..KssssssssK..', '.KsssKKKKsssK.', '.KssKssssKssK.',
      '.KssKssssKssK.', '..KssKKKKssK..', '..KssssssssK..', '...KssssssK...',
      '....KKKKKK....', '..............'
    ] },
    { name: 'ape', pal: { K, B: '#7a5230', b: '#5a3c22', S: '#c99a6a' }, rows: [
      '....KKKK....', '...KBBBBK...', '..KBSSSSBK..', '..KSKSSKSK..', '...KSSSSK...',
      '..KBBBBBBK..', '.KBBBBBBBBK.', '.KBbBBBBbBK.', '.KBKBBBBKBK.', '..KBBBBBBK..',
      '..KBBK.KBBK.', '..KBBK.KBBK.', '..KKK...KKK.', '............'
    ] },
    { name: 'gem', pal: { C: '#5fd2e0', Y: '#e8f4f0' }, rows: [
      '.CCCC.', 'CCYYCC', 'CYCCYC', 'CYCCYC', 'CCYYCC', '.CCCC.'
    ] },
    { name: 'herb', pal: { R: '#d23a3a', W: '#f0c0c0', G: '#4f9a4f' }, rows: [
      '...R...', '...R...', '..RRR..', '.RRWRR.', '..RRR..', '...R...', '...G...'
    ] },
    { name: 'tree', pal: { G: '#3f8f4f', g: '#2f7a3f', b: '#6e4a2b', B: '#7a5a3b' }, rows: [
      '.....GGGGGG.....', '...GGGGGGGGGG...', '..GGGGGGGGGGGG..', '.GGGGGgGGGGGGGG.',
      '.GGGGGGGGGGGGGG.', '.GGGGGGGGGGGGGG.', '..GGGGGGGGGGGG..', '...GGGGGGGGGG...',
      '.....bBBb.......', '.....bBBb.......', '.....bBBb.......', '.....bBBb.......',
      '.....bBBb.......', '....b.BBb.......', '....b.bBb.......', '....b..b........', '....b..b........', '....b..b........'
    ] },
    { name: 'rock', pal: { K, w: '#9aa0ad', d: '#6a7180' }, rows: [
      '............', '...KKKKKK...', '..KwwwwwwK..', '.KwwwwwwwwK.', '.KwddwwddwK.', '..KwwwwwwK..', '...KKKKKK...'
    ] },
    { name: 'tuft', pal: { g: '#4f9a4f' }, rows: [
      '........', '..g.g...', '.ggggg..', 'ggggggg.'
    ] },
    { name: 'sword', pal: { K, W: '#d8e0ee' }, rows: [
      '.KKWWWWK.', 'KKWWWWWWK', '.KKWWWWK.'
    ] },
    { name: 'ebullet', pal: { K, P: '#c060c0', R: '#ff5050' }, rows: [
      '.KKK.', 'KPRPK', 'PRRRP', 'KPRPK', '.KKK.'
    ] },

    // ================= 筑基 · 金丹篇（越国 / 乱星海） =================
    // 鬼灵门少主王蝉：一身锦袍，腰上挂金。笑起来眼睛不动。
    { name: 'wangchan', pal: { K, H: '#2a2030', S: '#f0cba4', G: '#8e2f3a', g: '#6b1f2a', Y: '#ffd24a' }, rows: [
      '....KKKK....', '...KHHHHK...', '..KHHHHHHK..', '..KSSSSSSK..', '..KSKSSKSK..',
      '...KSSSSK...', '..KGGGGGGK..', '.KGYGGGGYGK.', '.KGYGGGGYGK.', '..KgGGGGgK..',
      '..KGGKKGGK..', '..KGK..KGK..', '..KGK..KGK..', '..KKK..KKK..'
    ] },
    // 女修（汪凝 / 紫灵那一类）：长发过肩，衣色偏紫
    { name: 'nvxiu', pal: { K, H: '#1e1a24', S: '#f2d0ac', G: '#b85f8a', g: '#8a3f66' }, rows: [
      '...KKKKKK...', '..KHHHHHHK..', '..KHHHHHHK..', '..KHSSSSHK..', '..KHSKSSKH..',
      '...KSSSSK...', '..KGGGGGGK..', '.KGgGGGGgGK.', '.KGgGGGGgGK.', '..KGGGGGGK..',
      '..KGGGGGGK..', '..KGK..KGK..', '..KKK..KKK..', '..KKK..KKK..'
    ] },
    // 乱星海的老渔夫：斗笠压得低，一身咸味
    { name: 'laoyu', pal: { K, W: '#c8a861', S: '#d8b48f', G: '#5b6b78', g: '#3f4c56' }, rows: [
      '...KKKKKK...', '..KWWWWWWK..', '.KWWWWWWWWK.', '..KSSSSSSK..', '..KSKSSKSK..',
      '...KSSSSK...', '..KGGGGGGK..', '.KGgGGGGgGK.', '.KGgGGGGgGK.', '..KgGGGGgK..',
      '..KGGKKGGK..', '..KGK..KGK..', '..KKK..KKK..'
    ] },
    // 金青：青衫散修，在乱星海做古修遗址的买卖
    { name: 'jinqing', pal: { K, H: '#2b2b30', S: '#e9bd97', G: '#3f7a63', g: '#2b5544' }, rows: [
      '....KKKK....', '...KHHHHK...', '..KHHHHHHK..', '..KSSSSSSK..', '..KSKSSKSK..',
      '...KSSSSK...', '..KGGGGGGK..', '.KGgGGGGgGK.', '.KGgGGGGgGK.', '..KgGGGGgK..',
      '..KGGKKGGK..', '..KGK..KGK..', '..KGK..KGK..', '..KKK..KKK..'
    ] },
    // 鬼修：面无血色，袍子是深的，眼窝是空的
    { name: 'guixiu', pal: { K: '#141018', H: '#1a2a22', B: '#c8d8c0', D: '#2a3b33', d: '#1a271f' }, rows: [
      '....KKKK....', '...KHHHHK...', '..KHHHHHHK..', '..KBBBBBBK..', '..KBKBBKBK..',
      '...KBBBBK...', '..KDDDDDDK..', '.KDdDDDDdDK.', '.KDdDDDDdDK.', '..KdDDDDdK..',
      '..KDDKKDDK..', '..KDK..KDK..', '..KDK..KDK..', '..KKK..KKK..'
    ] },
    // 海妖兽：脊背有一道背鳍，眼睛是暗红的
    { name: 'haishou', pal: { K: '#101828', W: '#3f6f8f', w: '#2b5570', R: '#d04040', T: '#e8f0f8' }, rows: [
      '..K.............', '.KWK............', 'KWWWK...........', 'KWWWWWKKKKKKK...',
      'KWWWWWWWWWWWWK..', '.KWWWWWWWWWWWWK.', '..KWWKWWKWWWWWK.', '..KWWK.WWK.KWWK.',
      '..KRRK.KRRK.KKK.', '...KK...KK......'
    ] },
    // 机关傀儡：黑铁打的身子，胸口一块火纹
    { name: 'kui', pal: { K: '#1a1a24', M: '#7d8595', m: '#5a6272', R: '#ff7a3a' }, rows: [
      '..KKKKKKKKKK..', '.KMMMMMMMMMMK.', '.KMKMMMMMMKMK.', '.KMMMMMMMMMMK.',
      '.KMMKKKKKKMMK.', '.KMMKRRRRKMMK.', '.KMMKKKKKKMMK.', '.KMMMMMMMMMMK.',
      '..KKKKKKKKKK..', '..KmK....KmK..', '..KmK....KmK..', '..KmK....KmK..',
      '..KKK....KKK..'
    ] },
    // 毒蛟：昂着头立起来，一对短角，毒绿的鳞，眼睛是烧红的
    { name: 'dujiao', pal: { K: '#0e1a14', G: '#3f7a52', g: '#27543a', R: '#ff5a2a', T: '#dfe8d0' }, rows: [
      '..K......K..', '..KGK..KGK..', '..KGGGGGGK..', '..KGRGGRGK..', '..KGGGGGGK..',
      '...KGGGGK...', '...KGTTGK...', '....KGGK....', '...KGGGGK...', '..KGGGGGGK..',
      '..KGKGGKGK..', '..KGK..KGK..', '.KGGK..KGGK.', '.KgGK..KGgK.', '..KK....KK..'
    ] },
    // 地火：地脉火气凝出来的，没有固定形状，火舌卷成人形
    { name: 'huoling', pal: { K: '#3a1206', R: '#ff4a12', O: '#ff8a2a', Y: '#ffe27a' }, rows: [
      '.....KKK......', '....KRRK......', '...KRROK......', '..KROYOK......',
      '.KROYYYOK.....', 'KROYYYYYOK....', 'KROYYYYYYOK...', 'KROYYYYYYOK...',
      '.KOYYYYYOK....', '..KOYYYOK.....', '...KOOOK......', '....KKK.......'
    ] },
    // 内门弟子：白袍玉冠，和杂役的深绿一眼就能分开
    { name: 'neimen', pal: { K, H: '#242430', S: '#e9bd97', G: '#dfe6ee', g: '#aab4c2', B: '#8a6a2a' }, rows: [
      '....KKKK....', '...KHHHHK...', '..KHHHHHHK..', '..KSSSSSSK..', '..KSKSSKSK..',
      '...KSSSSK...', '..KGGGGGGK..', '.KGGGGGGGGK.', '.KGgGGGGgGK.', '..KBBBBBBK..',
      '..KGGGGGGK..', '..KGGKKGGK..', '..KGK..KGK..', '..KKK..KKK..'
    ] },
    // 林师兄：墨紫袍，脸白得没有血色，眼窝是陷进去的（千竹教的夺舍功夫在身上）
    { name: 'linmo', pal: { K: '#0d0a10', H: '#141018', S: '#cfd4cd', G: '#3a2f4a', g: '#281f34', B: '#6d1c26' }, rows: [
      '....KKKK....', '...KHHHHK...', '..KHHHHHHK..', '..KSSSSSSK..', '..KSKSSKSK..',
      '...KSSSSK...', '..KGGGGGGK..', '.KGGGGGGGGK.', '.KGgGGGGgGK.', '..KBBBBBBK..',
      '..KGGGGGGK..', '..KGGKKGGK..', '..KGK..KGK..', '..KKK..KKK..'
    ] },
    // ---- 灵宠 ----
    // 啼魂兽：灰白小兽，尾巴翘着，眼睛是红的
    { name: 'tihun', pal: { K: '#1b1b2a', W: '#cfd6e0', w: '#9aa4b4', R: '#ff6a6a' }, rows: [
      '..KKKK......', '.KWWWWK.....', 'KWWKWWWK....', 'KWWWWWWKKK..', 'KWWWWWWWWWK.',
      '.KWWWWRWWWK.', '..KWWWWWWK..', '..KWWWWWK...', '..KWK.KWK...', '..KK...KK...'
    ] },
    // 噬金虫：金壳，背上三道纹
    { name: 'shijin', pal: { K: '#241a06', G: '#e8c552', g: '#a8862a', R: '#ff5a3a' }, rows: [
      '..KKKK....', '.KGGGGK...', 'KGKGGKGKK.', 'KGGGGGGGGK', 'KGgGGgGGGK',
      '.KGGGGGGK.', '..KGGGGK..', '..KRKKRK..', '...KK.KK..'
    ] },
    // 六翼霜蚣：冰蓝身子，两侧短翼
    { name: 'liuyi', pal: { K: '#102029', B: '#8fd0e8', b: '#4f8fa8' }, rows: [
      '..K......K....', '.KBK....KBK...', 'KBBKKKKKKBBK..', 'KBBBBBBBBBBK..',
      '.KBBbbbbBBK...', '..KBK..KBK....', '..KBK..KBK....', '...K....K.....'
    ] },
    // 银月（器灵本体）：银白小狼，眼睛是月色的
    { name: 'yinyuepet', pal: { K: '#151a24', W: '#e8eef8', w: '#a8b6cc', B: '#9ad8ff' }, rows: [
      '..K.....K...', '.KWK...KWK..', '.KWWKKKWWK..', 'KWWWKWWWWK..', 'KWWBWWWBWWK.',
      '.KWWWWWWK...', '..KWWWWK....', '..KWK.WK....', '..KK...KK...'
    ] },
    // 冰凤：冰蓝羽，尾羽长
    { name: 'bingfeng', pal: { K: '#101a24', B: '#bfe6f5', b: '#6aa8c8', Y: '#ffe9a0' }, rows: [
      '.....KKK......', '....KBBBK.....', '...KBBBBBK....', '..KBBKBBKBBK..',
      '.KBBBBBBBBBK..', 'KBBKBBBBBKBBK.', '.KK.KBBBBK.KK.', '....KBBK......',
      '...KBK.KBK....', '..KK.....KK...'
    ] },
    // 飞鸽：联机「飞鸽传书」的鸽子。正视图振翅，白羽灰影金喙，与画面同一套描边配色
    { name: 'dove', pal: { K: '#1b1b2a', W: '#f2ece0', D: '#c9c2b4', Y: '#c9a24a', E: '#2b241a' }, rows: [
      '.....KKK.....', '....KWWWK....', '....KWWEK....', '..KKKWWWKKK..',
      '.KWWKWWWKWWK.', 'KWWWWWWWWWWWK', '.KWDWWWWWDWK.', '..KWWWWWWWK..',
      '....KYYYK....'
    ] }
  ];

  // ---------- 手绘跑步关键帧（四帧一轮，不增加任何文件） ----------
  // 程序化切片只能把整条腿上下挪 1.6 个精灵像素，挪不出「一腿提膝、一腿撑地」的形状。
  // 这里手写四组腿，只换精灵末尾那个人形腿块；X 是身体色占位符，逐精灵替换。
  // 帧序对上 sin(2·gait) 的四个象限：左提膝 → 并步 → 右提膝 → 蹬开。
  // 正面朝向的小人分不出前后，只能靠「一腿短一腿长」读出迈步，所以每帧两条腿必须一长一短。
  const RUN_LEGS = [
    ['..KXXKKXXK..', '..KXK..KXK..', '.KKK...KXK..', '.......KKK..'], // 左提膝外摆，右腿撑地
    ['..KXXKKXXK..', '...KXKKXK...', '...KXKKXK...', '...KKKKKK...'], // 并步：双腿收回身下
    ['..KXXKKXXK..', '..KXK..KXK..', '..KXK...KKK.', '..KKK.......'], // 右提膝外摆，左腿撑地
    ['..KXXKKXXK..', '..KXK..KXK..', '.KXK....KXK.', '.KK......KK.']  // 蹬开：双脚外八
  ];
  // 腿块只有三行的精灵（没有独立袍缘行）：把袍缘那一行让位给小腿。
  // 跑起来袍缘是直口的 —— 站着时那个豁口是站着才有的东西。
  const RUN_LEGS3 = RUN_LEGS.map(f => f.slice(1));
  // 墨大夫 16 宽，腿块也是三行（袍缘连着袍身 / 腿 / 脚），单独一组
  const RUN_LEGS_MO = [
    ['...KXKXXXXKXK...', '..KXK.XX..KXK...', '..........KKK...'],
    ['...KXKXXXXKXK...', '.....KXKKXK.....', '.....KKKKKK.....'],
    ['...KXKXXXXKXK...', '...KXK.XX..KXK..', '...KKK..........'],
    ['...KXKXXXXKXK...', '..KXK.XX...KXK..', '..KK.......KKK..']
  ];
  // 精灵名 → [模板, 身体色]。模板行数必须正好等于这个精灵腿块的行数。
  const RUN_SET = {
    hanli: [RUN_LEGS, 'G'], bandit: [RUN_LEGS, 'd'], assassin: [RUN_LEGS, 'd'],
    hermit: [RUN_LEGS, 'G'], disciple: [RUN_LEGS, 'G'], rogue: [RUN_LEGS, 'G'],
    wangchan: [RUN_LEGS, 'G'], jinqing: [RUN_LEGS, 'G'], guixiu: [RUN_LEGS, 'D'],
    laoyu: [RUN_LEGS3, 'G'], neimen: [RUN_LEGS3, 'G'], linmo: [RUN_LEGS3, 'G'],
    mo: [RUN_LEGS_MO, 'G']
  };
  window.RUN_SET = RUN_SET;   // 验收脚本照它逐条查
  for (const name in RUN_SET) {
    const spec = RUN_SET[name];
    const d = DEFS.find(x => x.name === name);
    if (!d) continue;
    const n = spec[0][0].length;
    for (let i = 0; i < 4; i++) {
      const legs = spec[0][i].map(r => r.split('X').join(spec[1]));
      DEFS.push({ name: name + '_run' + i, pal: d.pal, rows: d.rows.slice(0, d.rows.length - n).concat(legs) });
    }
  }
  // 帧库：把手绘跑步帧登记进 FRAME_SETS，供 game.js 的 framesOf/frameName/flashOf 取用。
  // （framesOf 只读 window.FRAME_SETS；缺失则跑步手绘帧永不生效，整页跑步都退回程序化切片）
  window.FRAME_SETS = { run: {} };
  for (const name in RUN_SET) window.FRAME_SETS.run[name] = { rows: RUN_SET[name][0] };

  const map = {};
  for (const d of DEFS) map[d.name] = make(d.rows, d.pal);
  window.Sprites = map;

  // ---------- 主角立绘：袍色随境界，甲色随护甲 ----------
  // 换护甲不是换个数字，是人看得见。同一个身架，改配色与腰带，一眼就知道换了什么。
  const HERO_ROWS = [
    '....KKKK....', '...KHHHHK...', '..KHHHHHHK..', '..KSSSSSSK..', '..KSKSSKSK..',
    '...KSSSSK...', '..KGGGGGGK..', '.KGGGGGGGGK.', '.KGgBBBBgGK.', '..KgGGGGgK..',
    '..KGGKKGGK..', '..KGK..KGK..', '..KGK..KGK..', '..KKK..KKK..'
  ];
  const heroCache = {};
  window.buildHeroSprite = function (opt) {
    opt = opt || {};
    const key = [opt.robe, opt.shade, opt.belt, opt.hair, opt.skin].join('|');
    if (heroCache[key]) return heroCache[key];
    const pal = {
      K: '#1b1b2a',
      H: opt.hair || '#2a2a36',
      S: opt.skin || '#e9bd97',
      G: opt.robe || '#3e8e4f',
      g: opt.shade || '#27613a',
      B: opt.belt || '#8a6a2a'
    };
    const c = make(HERO_ROWS, pal);
    heroCache[key] = c;
    return c;
  };
  // 手绘跑步帧也要跟着换色。主角的袍色随境界、甲色随护甲变（上面那个函数），
  // 帧要是还用炼气期的绿，人一跑起来袍子就会闪一下回绿 —— 这个坑只有真穿上护甲才看得见。
  const heroRunCache = {};
  window.buildHeroRun = function (opt) {
    opt = opt || {};
    const key = [opt.robe, opt.shade, opt.belt, opt.hair, opt.skin].join('|');
    if (heroRunCache[key]) return heroRunCache[key];
    const pal = {
      K: '#1b1b2a',
      H: opt.hair || '#2a2a36',
      S: opt.skin || '#e9bd97',
      G: opt.robe || '#3e8e4f',
      g: opt.shade || '#27613a',
      B: opt.belt || '#8a6a2a'
    };
    const tpl = RUN_SET.hanli[0], n = tpl[0].length;
    const out = [];
    for (let i = 0; i < 4; i++) {
      const legs = tpl[i].map(r => r.split('X').join('G'));
      out.push(make(HERO_ROWS.slice(0, HERO_ROWS.length - n).concat(legs), pal));
    }
    heroRunCache[key] = out;
    return out;
  };
  // 给 game.js 的统一入口：applyHeroSprite / heroLookNow 都靠它按当前袍色重绘手绘帧。
  // 目前只有 run 帧是手绘的，其余动作（idle/strike/hurt）没有手绘帧时返回 null，
  // 让 game.js 的 for 循环安全地跳过（不会把跑步帧误挂到其它动作上）。
  // 之前的版本漏了这个函数，导致 applyHeroSprite 只换了立绘、没换帧，
  // 主角一跑起来袍子就闪回炼气期的绿（verify-anim 第 8 节 firstDiff=7 的根因）。
  window.buildHeroFrames = function (look, action) {
    if (action !== 'run') return null;
    return window.buildHeroRun(look);
  };
  // 境界基准配色（没穿护甲时用它）
  window.HERO_ROBE = [
    { robe: '#3e8e4f', shade: '#27613a', belt: '#8a6a2a' }, // 炼气 · 外门绿
    { robe: '#2f6f7d', shade: '#1e4d57', belt: '#9a8a5a' }, // 筑基 · 青
    { robe: '#c2cad6', shade: '#8b95a4', belt: '#b99a55' }, // 结丹 · 月白
    { robe: '#5b4780', shade: '#3a2c56', belt: '#d4af37' }, // 元婴 · 紫金
    { robe: '#24242e', shade: '#3a3a46', belt: '#d4af37' }  // 化神 · 玄金
  ];
  // 护甲外观：穿了什么，身上就是什么颜色
  window.ARMOR_LOOK = {
    a_bu: { robe: '#6f6a60', shade: '#4a463e', belt: '#5a5248' },
    a_lupi: { robe: '#7a5a3a', shade: '#553d26', belt: '#3e2c1a' },
    a_ruanwei: { robe: '#4a4a52', shade: '#33333a', belt: '#6a6a72' },
    a_hanyu: { robe: '#7fb8c8', shade: '#4f8494', belt: '#c8e6ee' },
    a_xuangui: { robe: '#2f4a3a', shade: '#1c3026', belt: '#6a8a5a' },
    a_yunwen: { robe: '#e2e8f0', shade: '#b0bac8', belt: '#c8a850' },
    a_xuemo: { robe: '#5a1f2a', shade: '#3a1219', belt: '#c8a850' },
    a_jiaolong: { robe: '#2a3a5a', shade: '#18243a', belt: '#c0c8d8' },
    a_tiancan: { robe: '#d8d2c0', shade: '#a89e86', belt: '#b03a3a' }
  };
})();
