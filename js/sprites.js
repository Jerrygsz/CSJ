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
      '..KRKRRRRKRK..', '...KRK..KRK...', '...KRK..KRK...', '...KKK..KKK...', '..............', '..............'
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
    ] },

    // ================= 具名人物（按原著描写各画一张） =================
    // 共用模板的毛病：青颜真人、热火仙尊、景阳上人、采药老汉全是同一个 hermit，
    // 十二个 boss 共用一张 mo —— 玩家分不出谁是谁，人物就白写了。
    // 这里每人一张，骨架仍是同一套 12/14 宽小人（风格不散），
    // 差异全落在「头顶轮廓 + 面容 + 袍色 + 腰饰」这四处，也是像素小人唯一看得清的四处。

    // 墨大夫：原著「面色焦黄、病怏怏」「脸上黑气」「手上有老茧」→ 医者方巾、枯黄脸、下巴一团黑气、腰挂药囊
    { name: 'mo2', pal: { K: '#12161a', W: '#cfcbbc', S: '#d9bd86', M: '#6b6350', G: '#7e848c', g: '#575d66', B: '#8a6a2a' }, rows: [
      '...KKKKKK...',
      '..KWWWWWWK..',
      '..KWSSSSWK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '...KSMMSK...',
      '..KGGGGGGK..',
      '.KGgGGGGgGK.',
      '.KGgGGGGgGK.',
      '..KgBBBBgK..',
      '..KGGKKGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 厉飞雨：瘦削俊秀、剑使得最利落。高束发（剑客束发才利落）、深蓝劲装、皮带束腰
    { name: 'lifeiyu', pal: { K: '#1b1b2a', H: '#23202a', S: '#e2bd97', G: '#2b3a5c', g: '#1b2740', B: '#7a5a3a' }, rows: [
      '....KHHK....',
      '...KHHHHK...',
      '..KSHHHHSK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '...KSSSSK...',
      '..KGGGGGGK..',
      '.KGgGGGGgGK.',
      '.KGgGGGGgGK.',
      '..KgBBBBgK..',
      '..KGGKKGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 张铁：百锻堂的铁匠，后来被炼成巨汉。光头、赤膊宽肩、皮围裙
    { name: 'zhangtie', pal: { K: '#1a1614', S: '#d9ab7e', B: '#7a5a3a', b: '#573c24', s: '#3e2c1a' }, rows: [
      '...KSSSSK...',
      '..KSSSSSSK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '...KSSSSK...',
      '..KSSSSSSK..',
      '.KSSSSSSSSK.',
      '.KBBBBBBBBK.',
      '.KBbbbbbbBK.',
      '.KBbbbbbbBK.',
      '..KssKKssK..',
      '..KsK..KsK..',
      '..KsK..KsK..',
      '..KKK..KKK..'
    ] },
    // 李化元：黄枫谷韩立的师傅。玉冠、灰发、白须、赭黄袍、玉带 —— 门里长老的分量
    { name: 'lihuayuan', pal: { K: '#1b1b2a', Y: '#c8d4d0', H: '#3a3630', S: '#d8b48f', W: '#e2e0d6', G: '#a8823c', g: '#7d5e26', B: '#5f8a7c' }, rows: [
      '...KKKKKK...',
      '..KYYYYYYK..',
      '..KHHHHHHK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '..KSWWWWSK..',
      '..KGGGGGGK..',
      '.KGgGGGGgGK.',
      '.KGgGGGGgGK.',
      '..KgBBBBgK..',
      '..KGGKKGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 南宫婉：掩月宗。「面容娇艳欲滴」「常年头戴面纱」→ 面纱是她的招牌，白衣是掩月宗的色
    // 面纱原本只占下巴一行，在纸上读不出来；改成罩住口鼻、两侧垂到胸前，
    // 纱色调到 s≈0.18，墨化后才落得到石绿档（再淡就整片归宣纸白，和白袍糊在一起）
    { name: 'nangongwan', pal: { K: '#1b1b2a', H: '#1d1a22', S: '#f0cfab', W: '#9fbcb4', G: '#e8e8e2', g: '#c0c2bc', B: '#7c9e96' }, rows: [
      '....KKKK....',
      '...KHHHHK...',
      '..KHHHHHHK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '..KWWWWWWK..',
      '..KWGGGGWK..',
      '.KWgGGGGgWK.',
      '.KWgGGGGgWK.',
      '..KgBBBBgK..',
      '..KGGGGGGK..',
      '..KGK..KGK..',
      '..KKK..KKK..',
      '..KKK..KKK..'
    ] },
    // 紫灵：乱星海最出名的美人，「衣裳偏紫」。高髻、紫衣、金带 —— 一看就是被人围着的那位
    { name: 'ziling', pal: { K: '#1b1b2a', H: '#241a2c', S: '#f4d8bc', G: '#7a4a8c', g: '#563068', B: '#c8a850' }, rows: [
      '.....KK.....',
      '....KHHK....',
      '...KHHHHK...',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '...KSSSSK...',
      '..KGGGGGGK..',
      '.KGgGGGGgGK.',
      '.KGgGGGGgGK.',
      '..KgBBBBgK..',
      '..KGGGGGGK..',
      '..KGK..KGK..',
      '..KKK..KKK..',
      '..KKK..KKK..'
    ] },
    // 元瑶：「肌肤赛雪」「黑衣黑裙」「婀娜身段」→ 黑裙、露肩、雪肤、暗红腰带
    // 腰带原来是 h≈348 的暗红，墨化落到"墨紫"档，跟黑裙并成一片，等于没系；
    // 挪到 h≈3 的正朱砂相（#a02a24），才压得住黑
    { name: 'yuanyao', pal: { K: '#12100f', H: '#16141a', S: '#f8e0c8', G: '#1e1c22', g: '#2e2c34', B: '#a02a24' }, rows: [
      '....KKKK....',
      '..KHHHHHHK..',
      '..KHHSSHHK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '..KSSSSSSK..',
      '..KGGGGGGK..',
      '.KGSGGGGSGK.',
      '.KGgGGGGgGK.',
      '..KGBBBBGK..',
      '..KGGGGGGK..',
      '..KGK..KGK..',
      '..KKK..KKK..',
      '..KKK..KKK..'
    ] },
    // 大衍神君：寄身傀儡，「一身黄衫，肌肤如玉，神情冰冷，一丝笑容都没有」→ 玉肤、黄衫、面无表情
    { name: 'dayan', pal: { K: '#1b1b2a', H: '#2b2820', S: '#f0e8dc', G: '#c8a84a', g: '#9a7d2c', B: '#6a6250' }, rows: [
      '....KKKK....',
      '...KHHHHK...',
      '..KHHHHHHK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '...KSSSSK...',
      '..KGGGGGGK..',
      '.KGgGGGGgGK.',
      '.KGgGGGGgGK.',
      '..KgBBBBgK..',
      '..KGGKKGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 陆师兄：内门弟子，白玉冠、白袍、玉带。比白袍杂役多一顶冠、一条宽玉带
    { name: 'luxiong', pal: { K: '#1b1b2a', W: '#eef2f4', H: '#2c2c34', S: '#e8c8a4', G: '#e6e8e4', g: '#b8bcc0', B: '#7aa0a8' }, rows: [
      '...KKKKKK...',
      '..KWWWWWWK..',
      '..KHHHHHHK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '...KSSSSK...',
      '..KGGGGGGK..',
      '.KGGGGGGGGK.',
      '.KGgGGGGgGK.',
      '..KBBBBBBK..',
      '..KGGGGGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 青颜真人：散修里的「真人」，道髻、青袍、白须。青是被叫「青颜」的那个青
    { name: 'qingyan', pal: { K: '#1b1b2a', H: '#33302a', S: '#dcc09a', W: '#e4e2d6', G: '#2e6b62', g: '#1d4a44', B: '#8a7a4a' }, rows: [
      '....KKKK....',
      '...KHHHHK...',
      '..KHHHHHHK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '..KSWWWWSK..',
      '..KGGGGGGK..',
      '.KGgGGGGgGK.',
      '.KGgGGGGgGK.',
      '..KgBBBBgK..',
      '..KGGKKGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 热火仙尊：赤袍裹身，袍上两道暗火纹，金带。仙尊得有点压人的红
    { name: 'rehuo', pal: { K: '#1b1b2a', H: '#2a2028', S: '#e0b89a', R: '#b8362a', r: '#8a2418', B: '#e8c452' }, rows: [
      '...KKKKKK...',
      '..KHHHHHHK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '...KSSSSK...',
      '..KRRRRRRK..',
      '.KRRRRRRRRK.',
      '.KRrRRRRrRK.',
      '..KRRRRRRK..',
      '..KgBBBBgK..',
      '..KRRKKRRK..',
      '..KRK..KRK..',
      '..KRK..KRK..',
      '..KKK..KKK..'
    ] },
    // 景阳上人：寿眉长垂的老修士，素袍，不张扬
    { name: 'jingyang', pal: { K: '#1b1b2a', H: '#4a463c', S: '#dcc4a0', W: '#f2f0e6', G: '#d6d4c8', g: '#a8a89c', B: '#6a7a6a' }, rows: [
      '...KKKKKK...',
      '..KHHHHHHK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '..KSWWWWSK..',
      '...KSSSSK...',
      '..KGGGGGGK..',
      '.KGgGGGGgGK.',
      '.KGgGGGGgGK.',
      '..KgBBBBgK..',
      '..KGGKKGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 蟹道人：原著「面容儒雅的中年男子」「脸色木然」。方巾、褐袍，越朴素越像他
    { name: 'xiedaoren', pal: { K: '#1b1b2a', W: '#8a7a62', S: '#d8b892', G: '#6a5844', g: '#4a3c2c', B: '#3e3428' }, rows: [
      '...KKKKKK...',
      '..KWWWWWWK..',
      '..KWSSSSWK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '...KSSSSK...',
      '..KGGGGGGK..',
      '.KGgGGGGgGK.',
      '.KGgGGGGgGK.',
      '..KgBBBBgK..',
      '..KGGKKGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 金童：原著「约莫八九岁年纪的女童，头顶一束金色毛发高高竖立，粉雕玉琢」→ 那一束金毛就是她的身份
    { name: 'jintong', pal: { K: '#241a08', Y: '#e8c040', S: '#f6ddc4', G: '#c8a848', g: '#a8862a', B: '#8a5a2a' }, rows: [
      '......Y.....',
      '.....YY.....',
      '...KKKKKK...',
      '..KYYYYYYK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '...KSSSSK...',
      '..KGGGGGGK..',
      '.KGgGGGGgGK.',
      '..KgBBBBgK..',
      '..KGGGGGGK..',
      '..KGK..KGK..',
      '..KKK..KKK..',
      '..KKK..KKK..'
    ] },
    // 柳乐儿：「瓷娃娃般精致面容」的女童。深褐发、瓷白脸、青布衫
    { name: 'liuleer', pal: { K: '#1b1b2a', H: '#241c18', S: '#f8e4d0', G: '#8a9a76', g: '#66755a', B: '#a8845a' }, rows: [
      '....KKKK....',
      '...KHHHHK...',
      '..KHHHHHHK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '...KSSSSK...',
      '..KGGGGGGK..',
      '.KGgGGGGgGK.',
      '..KgBBBBgK..',
      '..KGGGGGGK..',
      '..KGGGGGGK..',
      '..KGK..KGK..',
      '..KKK..KKK..',
      '..KKK..KKK..'
    ] },

    // ================= 具名首领（后期同一个「魔修」「内门弟子」演了二十场的都在这） =================
    // 越皇：一国之主，冕板、赭黄龙袍、金纹玉带 —— 越国这条线的顶，得穿出「朝廷」而不是「魔修」
    { name: 'yuehuang', pal: { K: '#1b1b2a', Y: '#e8c452', H: '#2a2018', S: '#e0bc98', W: '#e4e0d4', G: '#b8862a', g: '#8a6320', B: '#5f7a5a' }, rows: [
      '...KKKKKK...',
      '..KYYYYYYK..',
      '..KHHHHHHK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '..KSWWWWSK..',
      '..KGGGGGGK..',
      '.KGYGGGGYGK.',
      '.KGGGGGGGGK.',
      '..KgBBBBgK..',
      '..KGGKKGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 六道·万天明：六道传人的本体。玄袍上六点朱砂，腰缠朱带 —— 魔道的「法」都在这几个红点上
    { name: 'liudao', pal: { K: '#16121a', H: '#1e1a22', S: '#d8c0a0', G: '#241c28', g: '#382e3c', R: '#a8281c' }, rows: [
      '...KKKKKK...',
      '..KHHHHHHK..',
      '..KHSSSSHK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '...KSSSSK...',
      '..KGGGGGGK..',
      '.KGRGGGGRGK.',
      '.KGgGGGGgGK.',
      '..KgRRRRgK..',
      '..KGGKKGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 乾老魔：阴罗宗大长老，修「五子同心魔」，真身附在五道白影里。左肩那一片白就是那五道影
    { name: 'qianlaomo', pal: { K: '#141018', H: '#2a2620', S: '#c8b094', W: '#e0ddd2', G: '#1e1a1e', g: '#2e2a30', B: '#7a2432' }, rows: [
      '...KKKKKK...',
      '..KHHHHHHK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '...KSSSSK...',
      '..KWWWWSK...',
      '..KGGGGGGK..',
      '.KWGgGGGGgK.',
      '.KWGgGGGGgK.',
      '..KgBBBBgK..',
      '..KGGKKGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 玄骨上人：原著现身的是一副「少年」面孔，性情却阴狠嗜血。少年白脸 + 玄袍骨白纹，这个反差就是他的识别符
    { name: 'xuangu', pal: { K: '#141018', H: '#141018', S: '#e6d0b8', G: '#3a2f4c', g: '#251e33', W: '#d8d2c0', B: '#6a5040' }, rows: [
      '....KKKK....',
      '...KHHHHK...',
      '..KHHHHHHK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '...KSSSSK...',
      '..KGGGGGGK..',
      '.KGgGGGGgGK.',
      '.KGWGGGGWGK.',
      '..KgBBBBgK..',
      '..KGGKKGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 夜叉王：灵界异族，青面、獠牙、骨甲。整场只有这一个长獠牙的，一眼就认得
    { name: 'yecha', pal: { K: '#10201a', B: '#3e7a62', T: '#f0ece0', W: '#d8d0bc' }, rows: [
      '..K.KKKK.K..',
      '..KKBBBBKK..',
      '..KBBBBBBK..',
      '..KBKBBKBK..',
      '..KBTBBTBK..',
      '...KBBBBK...',
      '..KWWWWWWK..',
      '.KWBWWWWBWK.',
      '.KWWWWWWWWK.',
      '..KWBBBBWK..',
      '..KWWKKWWK..',
      '..KWK..KWK..',
      '..KWK..KWK..',
      '..KKK..KKK..'
    ] },
    // 掩月宗大长老：掩月宗是女修宗门，一宗之主是位银发老妇。银发、月白袍、肩上一道青灰披帛
    { name: 'yanyue', pal: { K: '#1b1b2a', W: '#f4f2ea', S: '#e8c9a4', G: '#b9c6c2', g: '#8e9d99', B: '#546f6b' }, rows: [
      '...KKKKKK...',
      '..KWWWWWWK..',
      '..KWWSSWWK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '...KSSSSK...',
      '..KGGGGGGK..',
      '.KBGgGGGGgK.',
      '.KBGgGGGGgK.',
      '..KgBBBBgK..',
      '..KGGGGGGK..',
      '..KGK..KGK..',
      '..KKK..KKK..',
      '..KKK..KKK..'
    ] },
    // 寒骊上人：小极宫大长老，「声音犹若婴儿」，北地修寒焰；后现真身是「身高丈许、年轻数十岁的壮汉」。
    // 画的是他平日那副样子：玉冠、雪白须发、寒青袍 —— 小极宫在北地，一身冷色
    { name: 'hanlishang', pal: { K: '#1b2430', H: '#e8ecec', S: '#e0c8a8', W: '#f4f4ee', G: '#7fa8b4', g: '#4e7684', B: '#dfe8e8' }, rows: [
      '...KWWWWK...',
      '..KHHHHHHK..',
      '..KHSSSSHK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '...KSSSSK...',
      '..KGWWWWGK..',
      '.KGgGGGGgGK.',
      '.KGWGGGGWGK.',
      '..KgBBBBgK..',
      '..KGGKKGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 陇家老祖：真灵第一世家陇家之主。原著只给了一个硬特征——「面色淡金的中年修士」，
    // 外加「一股非人的冰冷气息」。淡金脸 + 黑金袍 + 金肩章，人界篇里没有第二张金脸
    { name: 'longjia', pal: { K: '#14140f', H: '#2a2418', S: '#d8b060', G: '#241f18', g: '#171410', B: '#c8a850', W: '#f0d478' }, rows: [
      '...KKKKKK...',
      '..KHHHHHHK..',
      '..KHSSSSHK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '...KSSSSK...',
      '..KGGGGGGK..',
      '.KGgGGGGgGK.',
      '.KGgGWGGgGK.',
      '..KgBBBBgK..',
      '..KGGKKGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 付家家主付天化：紫道山付家老祖，四百岁寿诞，「精神抖擞，红光满面」，
    // 平日是「严厉面孔」。红润脸 + 白须 + 紫袍，和别的老者区分在这张脸上
    { name: 'fujia', pal: { K: '#1a1420', H: '#d8d4cc', S: '#e8a878', G: '#5a3a6a', g: '#3f2850', B: '#c8a850', W: '#e8e4d8' }, rows: [
      '...KHHHHK...',
      '..KHHHHHHK..',
      '..KHSSSSHK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '...KSSSSK...',
      '..KGWWWWGK..',
      '.KGgGGGGgGK.',
      '.KGgGGGGgGK.',
      '..KgBBBBgK..',
      '..KGGKKGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 青龙上人：九星宗合体修士。九仙山初见是「黄袍儒生」，倚天城再遇是「四十来岁、面容方正威严的青袍中年人」，
    // 「单手持着一本白玉厚书」。青袍 + 黄带（两处描写的折中）+ 手上一册白玉书
    { name: 'qinglong', pal: { K: '#141a20', H: '#241c14', S: '#e8c8a0', G: '#2f6a6a', g: '#1e4a4a', B: '#c8a040', W: '#f0f4f4' }, rows: [
      '...KWWWWK...',
      '..KHHHHHHK..',
      '..KHSSSSHK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '...KSSSSK...',
      '..KGGGGGGK..',
      '.KWGgGGGGgK.',
      '.KWGgGGGGgK.',
      '..KgBBBBgK..',
      '..KGGKKGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 力尊者：魔界三尊者之一，「独角老者」，使一根黑色长棍，能化「三头六臂」。
    // 独角是他在原著里唯一的外形硬指标，所以画得比别人高一截（14×15），把角留出来；
    // 三头六臂这种东西 12 像素宽画不出来，画了也是糊的 —— 那一层交给战斗里的分身表现
    { name: 'lizunzhe', pal: { K: '#12100c', H: '#3a2c20', S: '#8a7a68', G: '#4a4438', g: '#332e26', B: '#1a1712', W: '#e0d8c8' }, rows: [
      '.....KWWK.....',
      '....KKKKKK....',
      '...KHHHHHHK...',
      '..KHHHHHHHHK..',
      '..KHSSSSSSHK..',
      '..KSSSSSSSSK..',
      '..KSKSSSSKSK..',
      '..KSWWSSWWSK..',
      '...KSSSSSSK...',
      '..KGGGGGGGGK..',
      '.KGGGgGGgGGGK.',
      '.KGGKgBBgKGGK.',
      '.KGGKGggGKGGK.',
      '..KKGK..KGKK..',
      '...KKK..KKK...'
    ] },
    // 血光圣祖：「身穿血袍的清秀少年」，目光「犹如寂空中的一对残月」。
    // 血袍的色相要压到 h≈2 的正朱砂相，原来的 348 会落进"墨紫"档，墨化后跟黑魔修并成一片
    { name: 'xueguang', pal: { K: '#1a0e12', H: '#1a1418', S: '#f0dcc8', G: '#9a1e1a', g: '#6a1210', B: '#3a2a2a', R: '#e03020' }, rows: [
      '...KKKKKK...',
      '..KHHHHHHK..',
      '..KHSSSSHK..',
      '..KSSSSSSK..',
      '..KSRSSRSK..',
      '...KSSSSK...',
      '..KGGGGGGK..',
      '.KGgGGGGgGK.',
      '.KGgGGGGgGK.',
      '..KgBBBBgK..',
      '..KGGKKGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 兽尊殿·魔尊：灵界魔道兽尊殿的「老怪物」，原著里殿中老者是「须发赤红」。
    // 赤红须发 + 兽骨肩甲，是这批魔尊里唯一带兽气的
    { name: 'shouzun', pal: { K: '#180f0c', H: '#b03a24', S: '#c09a78', G: '#4a3a28', g: '#332618', B: '#e0d8c0', W: '#e8dcc4' }, rows: [
      '...KHHHHK...',
      '..KHHHHHHK..',
      '..KHSSSSHK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '..KHSSSSHK..',
      '..KGGGGGGK..',
      '.KWGgGGgGWK.',
      '.KGgGGGGgGK.',
      '..KgBBBBgK..',
      '..KGGKKGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 元刹圣祖分魂：魔界圣祖之一，分魂降临只余一团魔气。双角、紫黑魔身、赤目
    { name: 'yuansha', pal: { K: '#0e0a14', H: '#241a30', S: '#c8b0c0', G: '#2a1c38', g: '#1a1024', B: '#5c3a6a', T: '#8f7ab0', R: '#e03020' }, rows: [
      '..TKKKKKKT..',
      '..KHHHHHHK..',
      '..KHSSSSHK..',
      '..KSSSSSSK..',
      '..KSRSSRSK..',
      '...KSSSSK...',
      '..KGGGGGGK..',
      '.KWGgGGgGWK.',
      '.KGgGGGGgGK.',
      '..KgBBBBgK..',
      '..KGGKKGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 守阵古修遗骸：守阵守到只剩一副枯骨的古修。骨色头身 + 残破青灰道袍 + 胸前两点阵纹
    { name: 'guxiuhai', pal: { K: '#14161a', H: '#d8ccb0', S: '#d8ccb0', G: '#4a5250', g: '#333a38', B: '#8a3a2a' }, rows: [
      '....KKKK....',
      '...KHHHHK...',
      '..KHHHHHHK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '...KSSSSK...',
      '..KGGGGGGK..',
      '.KGgGBBGgGK.',
      '.KGgGBBGgGK.',
      '..KgGGGGgK..',
      '..KGKKKGKK..',
      '..KGK..KGK..',
      '..KKK..KKK..',
      '..KKK..KKK..'
    ] },
    // 落日之墓·噬炎：灵族的壮汉外形，本体却是一颗「噬火珠」。赤褐皮 + 胸口那颗赤珠
    { name: 'shiyan', pal: { K: '#1a0e08', H: '#2a180e', S: '#c88a5a', G: '#6a3a24', g: '#4a2616', B: '#3a2018', R: '#fff0c0' }, rows: [
      '...KKKKKK...',
      '..KHHHHHHK..',
      '..KHSSSSHK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '...KSSSSK...',
      '..KGGGGGGK..',
      '.KGgGRRgGGK.',
      '.KGgGRRgGGK.',
      '..KgBBBBgK..',
      '..KGGKKGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 鸾鸣门·双修夫妇：龙晗「一身灰袍，相貌伟奇，骨骼宽大」，与道侣凤冰联手可抗元婴后期。
    // 一个人一条 12 像素宽的身子画不下两位，所以画的是龙晗：宽肩（顶到边）+ 双肩赤凤羽，凤冰在那两道羽里
    { name: 'luanming', pal: { K: '#16161c', H: '#20201c', S: '#e0bc94', G: '#6a6a66', g: '#48484a', B: '#c8a040', R: '#b83028' }, rows: [
      '...KKKKKK...',
      '..KHHHHHHK..',
      '..KHSSSSHK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '...KSSSSK...',
      '.KGGRGGRGGK.',
      '.KGGgGGgGGK.',
      '.KGGgGGgGGK.',
      '..KgBBBBgK..',
      '..KGGKKGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 广寒界·通灵傀儡：广寒界的冰玉傀儡。没有脸，只有两道蓝眼缝；关节镶铜（兼作墨化后的第四档色），
    // 让人一看就知道是"做出来的东西"而不是人
    { name: 'guanghan', pal: { K: '#16202a', G: '#cfe0e8', g: '#9fbcc8', H: '#8a7a5a', B: '#3a7a9a' }, rows: [
      '....KKKK....',
      '...KGGGGK...',
      '..KGGGGGGK..',
      '..KGGGGGGK..',
      '..KBKGGKBK..',
      '...KGGGGK...',
      '..KGGGGGGK..',
      '.KGKGBBGKGK.',
      '.KGKGGGGKGK.',
      '..KGHHHHGK..',
      '..KGGKKGGK..',
      '..KGK..KGK..',
      '..KHK..KHK..',
      '..KKK..KKK..'
    ] },

    // ===== 仙界篇首领（原著 X4/X5 卷）：此前 7 个具名者全共用「魔修 mo」 =====
    // 古或今：时间道祖、天庭之主。「面如冠玉，眉眼细长，唇边颌下皆生有黑色长须，
    //   端坐在白玉轮椅之上」→ 冠玉脸、黑色长须压到下巴、白袍金纹
    { name: 'guhuojin', pal: { K: '#14121a', H: '#14121a', S: '#f2e4d2', G: '#eae7dc', g: '#c6c2b2', B: '#1a1a1a', W: '#d0a850' }, rows: [
      '....KKKK....',
      '...KHHHHK...',
      '..KHHHHHHK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '..KBSSSSBK..',
      '..KBBBBBBK..',
      '..KGGGGGGK..',
      '.KGWGGGGWGK.',
      '.KGGgWWgGGK.',
      '..KGGKKGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 奇摩子：天庭仙狱之主。「那位火发男子，正是家师奇摩子」→ 火发是唯一硬特征，
    //   发顶画成两簇外挑的火苗；袍用暗红（仙狱血色），金饰压一层
    { name: 'qimozi', pal: { K: '#180c0a', H: '#d84818', S: '#e8c9a4', G: '#2a1414', g: '#1a0c0c', B: '#c8a040', W: '#f09040' }, rows: [
      '..K.KKKK.K..',
      '..KKHHHHKK..',
      '..KHHHHHHK..',
      '..KHSSSSHK..',
      '..KSKSSKSK..',
      '...KSSSSK...',
      '..KGGGGGGK..',
      '.KGWGGGGWGK.',
      '.KGgGGGGgGK.',
      '..KgBBBBgK..',
      '..KGGKKGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 妙法仙尊：九元观四大圣使。「绿发少女」→ 绿发、月白仙裙、淡绿腰封。
    //   全书绿发的只她一个，发色本身就是身份证
    { name: 'miaofa', pal: { K: '#16201a', H: '#4a9a5a', S: '#f6dcc0', G: '#e8f0e6', g: '#c4d4c8', B: '#8ec49a' }, rows: [
      '...KKKKKK...',
      '..KHHHHHHK..',
      '..KHHHHHHK..',
      '..KHSSSSHK..',
      '..KSKSSKSK..',
      '...KSSSSK...',
      '..KGGGGGGK..',
      '.KGgGGGGgGK.',
      '.KGBGGGGBGK.',
      '..KgBBBBgK..',
      '..KGGKKGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 东方白：金源仙宫之主。「身着白色锦袍的中年男子…两鬓微霜，眼眸深邃」→
    //   白锦袍 + 两鬓灰白（发只在外侧两格灰）+ 金源宫的金冠
    { name: 'dongfangbai', pal: { K: '#1a1a20', H: '#2e2e34', S: '#e8cfa8', G: '#f2eee2', g: '#cfc9b8', B: '#c8a850', W: '#b8b4aa' }, rows: [
      '...KBBBBK...',
      '..KWHHHHWK..',
      '..KHHHHHHK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '...KSSSSK...',
      '..KGGGGGGK..',
      '.KGgGGGGgGK.',
      '.KGBGGGGBGK.',
      '..KgBBBBgK..',
      '..KGGKKGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 东离虎：天庭道祖。「名为东离虎的虬髯大汉」→ 络腮虬髯（两颊 + 颌下满须）、
    //   宽肩（肩行顶满 12 格）、深褐战甲 + 金边
    { name: 'donglihu', pal: { K: '#1a140e', H: '#2a1c12', S: '#c98f5a', G: '#3a3026', g: '#241c16', B: '#2a1a10', W: '#b89050' }, rows: [
      '...KKKKKK...',
      '..KHHHHHHK..',
      '..KHHHHHHK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '..KBSSSSBK..',
      '..KBBBBBBK..',
      '.KGGGGGGGGK.',
      '.KGWGGGGWGK.',
      '..KgBBBBgK..',
      '..KGGKKGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 萧晋寒：北寒仙宫宫主。「冰晶巨碑顶端，一袭雪袍的萧晋寒，双手拄剑站立其上」→
    //   雪袍 + 身前一把竖剑（袍中央那条白线就是剑），冰蓝做北寒的点色。
    //   剑色必须比雪袍深一档：第一版给的是近白色，雪袍上一条白线等于没画
    { name: 'xiaojinhan', pal: { K: '#1c2430', H: '#33404f', S: '#f0dcc4', G: '#eef2f6', g: '#c4d2dc', B: '#6aa8c8', W: '#86b0c8' }, rows: [
      '...KKKKKK...',
      '..KHHHHHHK..',
      '..KHHHHHHK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '...KSSSSK...',
      '..KGGGGGGK..',
      '.KGgGGGGgGK.',
      '.KGBGGGGBGK.',
      '..KGGWWGGK..',
      '..KGGWWGGK..',
      '..KGKWWKGK..',
      '..KGKWWKGK..',
      '..KKKWWKKK..'
    ] },
    // 鬼木：幽冥界域主座下。「黑袍幽奴…白色小兽歪着头…化为一团白影窜入了鬼木怀里」→
    //   黑袍 + 面皮青灰（幽奴非人）+ 胸前两行白色小兽
    { name: 'guimu', pal: { K: '#10141a', H: '#14181e', S: '#bfc8c8', G: '#1c2028', g: '#12151b', B: '#e8ecf0', W: '#5a7a8a' }, rows: [
      '...KKKKKK...',
      '..KHHHHHHK..',
      '..KHHHHHHK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '...KSSSSK...',
      '..KGGGGGGK..',
      '.KGgGBBgGGK.',
      '.KGgGBBgGGK.',
      '..KgWWWWgK..',
      '..KGGKKGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 骨皇：幽冥界骨皇。「被他称作骨皇的百骨骷髅」→ 整张脸没有肉，只有黑洞眼窝和
    //   鼻骨；头顶三根骨冠，肋部横缝；坐骑巨龟交给出场文案，不在小图里塞
    { name: 'guhuang', pal: { K: '#1a1814', W: '#e8e4d4', w: '#b8b4a4', B: '#8a8474' }, rows: [
      '..K.KKKK.K..',
      '..KKWWWWKK..',
      '..KwWWWWwK..',
      '..KWWWWWWK..',
      '..KWKWWKWK..',
      '..KWWKKWWK..',
      '..KWWWWWWK..',
      '.KWWWWWWWWK.',
      '.KWKWWWWKWK.',
      '..KwWWWWwK..',
      '..KWWKKWWK..',
      '..KWK..KWK..',
      '..KWK..KWK..',
      '..KBK..KBK..'
    ] },
    // 百目天鬼：「百目」— 全书唯一以眼为名的首领。头顶两对、胸腹四对，黄眼压在
    //   灰紫身上；不画獠牙不画角，辨识点就是"身上到处是眼睛"
    { name: 'baimu', pal: { K: '#141018', G: '#4a4258', g: '#332c40', B: '#e8c040' }, rows: [
      '...KKKKKK...',
      '..KGGGGGGK..',
      '..KGGGGGGK..',
      '..KGBGGBGK..',
      '..KGBGGBGK..',
      '...KGGGGK...',
      '..KGGGGGGK..',
      '.KGBGBGBGBK.',
      '.KGGGGGGGGK.',
      '..KgBGGBgK..',
      '..KGGKKGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 金光上人：七玄门篇的幕后仙师。「是一个三尺来高的侏儒」「这红袍侏儒」→
    //   头大身短（头占 7 行、腿只 3 行）+ 红袍金饰。12px 表现不了三尺，
    //   就靠头身比和"比谁都矮"的辨识度
    { name: 'jinguang', pal: { K: '#1a0e0a', H: '#2a1a12', S: '#e8c9a4', G: '#9a2018', g: '#6a1410', B: '#d8b048' }, rows: [
      '...KKKKKK...',
      '..KHHHHHHK..',
      '..KHHHHHHK..',
      '..KSSSSSSK..',
      '..KSKSSKSK..',
      '..KSSSSSSK..',
      '...KSSSSK...',
      '..KGGGGGGK..',
      '.KGBGGGGBGK.',
      '.KGgGGGGgGK.',
      '..KgBBBBgK..',
      '..KGK..KGK..',
      '..KKK..KKK..',
      '..KKK..KKK..'
    ] },
    // 凶司王：灵界凶兽化形。「头顶有一对巨大之极的弯角，四肢均都比常人长出一大截，
    //   赤红双目」→ 角从头顶两侧外翻两格（不贴最外缘，否则被墨轮廓吃掉）、
    //   手臂多出一行（垂到腰下）、双眼赤红。角是石灰，不能用深色：深色的角贴在黑身上等于没长
    { name: 'xiongsiwang', pal: { K: '#0e0a0e', G: '#1e1a24', g: '#141018', B: '#8a8098', R: '#e03020' }, rows: [
      '.KB......BK.',
      '..KBGGGGBK..',
      '..KGGGGGGK..',
      '..KGGGGGGK..',
      '..KGRGGRGK..',
      '...KGGGGK...',
      '..KGGGGGGK..',
      '.KGgGGGGgGK.',
      'KGGgGGGGgGGK',
      'KGGgGGGGgGGK',
      '..KgBBBBgK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 吞天圣祖：魔界圣祖。「白发老翁，一身皂袍，两手奇长过膝」→ 白发白须、
    //   皂袍、手臂多垂一行到腰下。圣祖的排场交给出场文案
    { name: 'tuntian', pal: { K: '#141210', H: '#e8e4dc', S: '#e0c4a0', G: '#242220', g: '#161412', B: '#e8e4dc' }, rows: [
      '...KKKKKK...',
      '..KHHHHHHK..',
      '..KHHHHHHK..',
      '..KHSSSSHK..',
      '..KSKSSKSK..',
      '..KBSSSSBK..',
      '..KBBBBBBK..',
      '..KGGGGGGK..',
      '.KGGgGGgGGK.',
      'KGgBBBBBBgGK',
      'KGgGGKKGGgGK',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },

    // ---------- 第二档：有原著硬外貌依据的具名首领 ----------
    // 依据核实原则：只认"人名与长相词同句出现"的原文。查不到的一律不画——
    //   黑枭王、佛骨王、紫杉、大罗鬼王、第一魔尊、天外魔君、米尊者、天象尊者、
    //   古魔主魂、银阶木族，全书没有一句写他们长什么样，硬画就是编造。

    // 元魇：魔界三大始祖之一。§2087「黑袍青年」（灵王虚影冲其抱拳、宝花称其"道友"）→
    //   黑袍青年 + 披发垂肩 + 胸前血玉。和玄骨/六道同为黑袍，靠披发轮廓与胸前那块朱玉分开
    { name: 'yuanyan', pal: { K: '#0e0c12', H: '#16121c', S: '#e6d8d0', G: '#2a2434', g: '#1a1626', B: '#3a2040', W: '#d02018' }, rows: [
      '...KKKKKK...',
      '..KHHHHHHK..',
      '..KHHHHHHK..',
      '..KHSSSSHK..',
      '..KSKSSKSK..',
      '..KSSSSSSK..',
      '..KGGGGGGK..',
      '.KHgGWWGgHK.',
      '.KHgGWWGgHK.',
      '..KgBBBBgK..',
      '..KGGGGGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 宝花圣祖：魔界三大始祖。「白裙女子」「本圣祖」「美眸晶光闪动」→
    //   白裙 + 黑发高髻 + 朱红披帛垂两侧 + 额间花钿。全身只两处朱，墨化后是整张图上最跳的点
    { name: 'baohua', pal: { K: '#241c1c', H: '#141018', S: '#f4dcc8', G: '#eef2f0', g: '#c4ccc8', B: '#c02820', W: '#d8b048' }, rows: [
      '....KKKK....',
      '...KHHHHK...',
      '..KHHHHHHK..',
      '..KHSSSSHK..',
      '..KHSBBSHK..',
      '..KSKSSKSK..',
      '..KSSSSSSK..',
      '.KBGGGGGGBK.',
      '.KBGGGGGGBK.',
      '.KBGgWWgGBK.',
      '..KGGGGGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 黄元子：大乘。「枯瘦男子」「黄袍男子」「身材瘦削」→
    //   整个人收窄两格（肩只有 4 格宽）+ 藤黄袍 + 白须从颌下一直垂到胸口盖住肩线
    { name: 'huangyuanzi', pal: { K: '#1a1610', H: '#2a2418', S: '#dcc0a0', G: '#b89020', g: '#8a6a10', B: '#4a3a20', W: '#d0d8dc' }, rows: [
      '...KKKKKK...',
      '..KHHHHHHK..',
      '..KHHHHHHK..',
      '..KHSSSSHK..',
      '..KSKSSKSK..',
      '..KSSSSSSK..',
      '..KWWWWWWK..',
      '...KGGGGK...',
      '..KGgGGgGK..',
      '..KGgBBgGK..',
      '...KGGGGK...',
      '...KGKKGK...',
      '...KGKKGK...',
      '...KKKKKK...'
    ] },
    // 银翅夜叉：鬼物。「背后一只银翅却从后一伸的挡在其身前」「嘴边獠牙暴涨倍许，
    //   双目迸射万道银芒」→ 造型的全部就是那对翅：占到 14 宽，两片银翅各两格、
    //   从肩垂到膝盖，獠牙与双目的银是同一档色
    { name: 'yinchiyecha', pal: { K: '#14161a', H: '#2a3038', S: '#9aa4ac', G: '#2a3038', g: '#1a1f24', B: '#c8d4dc', W: '#e8eef2' }, rows: [
      '....KKKKKK....',
      '...KHHHHHHK...',
      '...KHHHHHHK...',
      '...KHSSSSHK...',
      '...KSKSSKSK...',
      '...KSWSSWSK...',
      'KWWKGGGGGGKWWK',
      'KWWKGggggGKWWK',
      'KWWKGgBBgGKWWK',
      'KWWKGGGGGGKWWK',
      'KWWKGGGGGGKWWK',
      '.KWKGGGGGGKWK.',
      '...KGGKKGGK...',
      '....KK..KK....'
    ] },
    // 敖啸老祖：妖族大乘。「敖啸那头老狼」「敖啸妖王是家祖」+「清秀异常脸孔」
    //   「清秀儒雅的面孔」→ 银月一族狼妖，所以银发有出处（不是给老祖硬加白发）：
    //   银发 + 清秀年轻脸 + 深青袍 + 玉带。和白须青颜真人同是青袍，
    //   靠"银发而非白须、脸是青年而非老者"分开
    { name: 'aoxiao', pal: { K: '#141a1c', H: '#c8d0d4', S: '#f0dcc8', G: '#1e3a3c', g: '#122426', B: '#7ab0a8', W: '#e0e8e8' }, rows: [
      '..K.KKKK.K..',
      '..KKHHHHKK..',
      '..KHHHHHHK..',
      '..KHSSSSHK..',
      '..KSKSSKSK..',
      '..KSSSSSSK..',
      '..KGGGGGGK..',
      '.KGgGGGGgGK.',
      '.KGgBBBBgGK.',
      '..KGgGGgGK..',
      '..KGGGGGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 至阳上人：正道盟太真门。「约四十余岁，皮肤晶莹洁白，五官端正儒雅」→
    //   皮肤是全库最亮的一档（#faf0e4，故意比别的角色白一档）+ 象牙白道袍 + 朱红领缘
    //   与腰带 + 玉簪穿道髻
    { name: 'zhiyang', pal: { K: '#1c1a16', H: '#2a2620', S: '#faf0e4', G: '#e6e8ee', g: '#c0c4cc', B: '#c02820', W: '#d8ece0' }, rows: [
      '...KKKKKK...',
      '...KHWHHK...',
      '..KHHHHHHK..',
      '..KHSSSSHK..',
      '..KSKSSKSK..',
      '..KSSSSSSK..',
      '..KBGGGGBK..',
      '.KGgGGGGgGK.',
      '.KGgGGGGgGK.',
      '..KgBBBBgK..',
      '..KGGGGGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 柳自在：天狐一族大罗。「青袍中年男子」→ 青袍（偏冷石青，不是青颜的草青）+
    //   两鬓银灰 + 玉带。狐族不靠耳朵（原文没写），靠细长眼与银鬓区分
    { name: 'liuzizai', pal: { K: '#141a1c', H: '#22282a', S: '#ecd8c4', G: '#2a4a58', g: '#1a3038', B: '#c8b070', W: '#c8ccd0' }, rows: [
      '...KKKKKK...',
      '..KHHHHHHK..',
      '..KHHHHHHK..',
      '..KHSSSSHK..',
      '..KSKSSKSK..',
      '..KSSSSSSK..',
      '..KGGGGGGK..',
      '.KGWGGGGWGK.',
      '.KGgBBBBgGK.',
      '..KGgGGgGK..',
      '..KGGGGGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 不灭天尊：大乘。「幻化出一名满脸蛇纹的青年道士，双目赫然瞳孔倒竖和巨蟒一般无二」→
    //   原著把长相写死了：满脸青绿蛇纹 + 金色竖瞳。蛇纹是这张图唯一的身份证明，
    //   所以整张脸都铺纹，只留眼周一圈干净好让金瞳跳出来
    { name: 'bumietianzun', pal: { K: '#101a14', H: '#1a2a20', S: '#d8dcc8', G: '#1e3024', g: '#121e16', B: '#4a8a50', W: '#e0b030' }, rows: [
      '...KKKKKK...',
      '..KHHHHHHK..',
      '..KHHHHHHK..',
      '..KHSSSSHK..',
      '..KSKSSKSK..',
      '..KSBSSBSK..',
      '..KBSSSSBK..',
      '..KGGGGGGK..',
      '.KGgBBGGgGK.',
      '..KgBBBBgK..',
      '..KGGGGGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 鬼灵子：仙界鬼修首脑。「本就苍白的脸」「身形一散，化作一片鬼雾」→
    //   惨白面孔 + 灰紫鬼雾。下半身不收腿，直接收成一根锥形雾尾——这是"化雾"
    //   唯一在 12 格内的表达方式，也是它和其他所有鬼修的分水岭
    { name: 'guilingzi', pal: { K: '#1a1620', H: '#2a2430', S: '#e8e4ec', G: '#7a6a88', g: '#544a60', B: '#8a7a98', W: '#b8acc4' }, rows: [
      '...KKKKKK...',
      '..KHHHHHHK..',
      '..KHHHHHHK..',
      '..KHSSSSHK..',
      '..KSKSSKSK..',
      '..KSSSSSSK..',
      '..KGGGGGGK..',
      '.KGgGGGGgGK.',
      '.KGgBBBBgGK.',
      '..KWGWWGWK..',
      '..KWGWWGWK..',
      '...KWWWWK...',
      '....KWWK....',
      '.....KK.....'
    ] },
    // 陆夫人：御灵宗。「对一旁的黑袍女子说道」→ 黑袍女子 + 高髻 + 银冠。
    //   和元魇同是黑袍，她是女性高髻配银饰、腰封是银，元魇是披发配胸前朱玉
    { name: 'lufuren', pal: { K: '#0e0c10', H: '#181418', S: '#e8d8d0', G: '#1e2a30', g: '#141c22', B: '#a8b0b8', W: '#3a2a38' }, rows: [
      '....KKKK....',
      '...KHHHHK...',
      '..KBBBBBBK..',
      '..KHSSSSHK..',
      '..KSKSSKSK..',
      '..KSSSSSSK..',
      '..KGGGGGGK..',
      '.KGgGGGGgGK.',
      '.KGgGGGGgGK.',
      '..KgBBBBgK..',
      '..KGGGGGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 马良：九元观真仙。「一名被符链捆束的俊美青年，眉宇间处的金色灵纹骤然闪了一下」→
    //   俊美青年 + 眉间金纹 + 金冠。袍色是淡金白（#f0e8c8）——和宝花的冷白、
    //   至阳的赭白凑成三档不同的"白"，墨化后各走各的淡彩
    { name: 'maliang', pal: { K: '#2a2418', H: '#1e1a14', S: '#f6e4d0', G: '#f6f2e2', g: '#d8d2bc', B: '#a88020', W: '#a88020' }, rows: [
      '...KKBBKK...',
      '..KHHHHHHK..',
      '..KHHHHHHK..',
      '..KHSBBSHK..',
      '..KSWSSWSK..',
      '..KSSSSSSK..',
      '..KGGGGGGK..',
      '.KGgGGGGgGK.',
      '.KGgGGGGgGK.',
      '..KgBBBBgK..',
      '..KGGGGGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 妙鹤真人：「这道士」「面容变得如此年轻，容貌却和当年没有多大改变」→
    //   道士髻 + 青年面孔 + 灰蓝道袍 + 胸前白鹤纹（"妙鹤"落在衣上，不在脸上）
    { name: 'miaohe', pal: { K: '#161a1c', H: '#242a2c', S: '#f0dcc4', G: '#4a5a68', g: '#303c46', B: '#8ab0b8', W: '#e4ecec' }, rows: [
      '...KKKKKK...',
      '..KHHHHHHK..',
      '..KHHHHHHK..',
      '..KHSSSSHK..',
      '..KSKSSKSK..',
      '..KSSSSSSK..',
      '..KGGGGGGK..',
      '.KGgGGGGgGK.',
      '.KGgWWWWgGK.',
      '..KgBBBBgK..',
      '..KGGGGGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 冷焰老祖：「面孔方正，双目炯然」→ 方正的脸（下巴收成直角，不尖）+
    //   冷青焰色袍。名号里那个"焰"落在袍上的青蓝火苗上，不画成红火
    { name: 'lengyan', pal: { K: '#12181c', H: '#1e2830', S: '#e8d4bc', G: '#5a7a92', g: '#3c5668', B: '#6ac8d8', W: '#d0f0f8' }, rows: [
      '...KKKKKK...',
      '..KHHHHHHK..',
      '..KHHHHHHK..',
      '..KHSSSSHK..',
      '..KSWSSWSK..',
      '..KSSSSSSK..',
      '..KGGGGGGK..',
      '.KGgGGGGgGK.',
      '.KGgGGGGgGK.',
      '..KgBWWBgK..',
      '..KGGWWGGK..',
      '..KGK..KGK..',
      '..KGK..KGK..',
      '..KKK..KKK..'
    ] },
    // 黑天魔祖：「身形砰然碎裂，化为了一片黑色烟雾」「黑雾凝结，化作一只巨大手掌」→
    //   整个人是一团凝住的黑雾：轮廓比常人宽一格，下摆散成一缕缕，只有一对眼睛是实色
    { name: 'heitian', pal: { K: '#0c0a0e', H: '#141018', S: '#3a3038', G: '#1a1620', g: '#100c14', B: '#d03018', W: '#4a4048' }, rows: [
      '...KKKKKK...',
      '..KHHHHHHK..',
      '..KHHHHHHK..',
      '..KHSSSSHK..',
      '..KSKBBKSK..',
      '..KSSSSSSK..',
      '..KGGGGGGK..',
      '.KGgGGGGgGK.',
      '.KGgGGGGgGK.',
      '.KGgGGGGgGK.',
      '.KGGGGGGGGK.',
      'KGgGKGGKgGGK',
      'KGK.GGGG.KGK',
      '.K...KK...K.'
    ] },
    // 魔猿 16x16（兽形要更多格）：「身穿紫色战甲的黑色魔猿」「头生三只独角，阔口獠牙，
    //   双臂奇长过膝」→ 12x14 的 168 格分不下来；前六版在「紫衣人 / 黑块」之间反复。
    //   三只尖角间隔 4 格；脸 7 行 x 12 宽吃满面积；阔口 2 行高、上下各两枚獠牙
    //   （只画一行白牙是白胡子）。四条硬约束：
    //   ① 躯干收成梯形（肩宽 → 胸 → 收腰），矩形紫甲 + 两根柱子读成「两个方块叠着」；
    //   ② 手臂要做手（末端比臂宽一格）+ 肘内收 —— 直通到底的柱子读不出是手臂；
    //   ③ 四肢 2 格宽（1 格宽被 outline 沿边补 K，走成一串点）；
    //   ④ 毛色比躯干亮一档（全黑会糊在深色背景里）
    { name: 'moyuanbeast', pal: { K: '#0b0910', H: '#241f2a', M: '#3d3646', S: '#7a5c4e', G: '#6a3690', g: '#43215e', B: '#f2eee0', W: '#b8b0c4', R: '#e03018' }, rows: [
      '...KWK.KWK.KWK..',
      '..KWWWKWWWKWWWK.',
      '.KHHHHHHHHHHHHK.',
      '.KHHHHHHHHHHHHK.',
      '.KSSHHHHHHHHSSK.',
      '.KHHSSSSSSSSHHK.',
      '.KHHSRSSSSRSHHK.',
      '.KHHHSSSSSSHHHK.',
      '.KHHSSSSSSSSHHK.',
      '.KSSBKKKKKKBSSK.',
      '.KSSSBKKKKBSSSK.',
      'KMMMMHHHHHHMMMMK',
      'MMKKGGGGGGGGKKMM',
      'MMKGGGGGGGGGGKMM',
      'KMMGGggggggGGMMK',
      'MMMKHHHKKHHHHMMM'
    ] },
    // 修罗蛛·族母 16x16：「玉手一动的往发髻上一抚而过，竟掐下了一小缕长发」→ 上身人形
    //   （发髻金簪、两鬓长发、腹上修罗之心），下身人首蛛腹 + 两侧各两条腿。
    //   12x14 里蛛腿怎么摆都读成护肩/护耳/珠串（蛛腹和上身同宽，腿没伸展空间）。
    //   16 宽下蛛腹 8 格、上身 6 格，剪影上窄下宽。
    //   蛛腿 2 格宽、只给 2 行（3 行 6 格的块读成两片翅膀）；另给蛛腹加两道横纹 ——
    //   分节的腹部是蛛最强的符号，比腿更能在小尺寸下读出来
    { name: 'xiuluo', pal: { K: '#120a12', H: '#241826', S: '#f4e2cc', G: '#4a2642', g: '#2a1430', B: '#d0a840', W: '#f0ecf8', T: '#a082ac' }, rows: [
      '.....KBBBBK.....',
      '....KHHHHHHK....',
      '...KHHHHHHHHK...',
      '...KHSKSSKSHK...',
      '...KHSSSSSSHK...',
      '...KHHSSSSHHK...',
      '...KHGGGGGGHK...',
      '....KGggggGK....',
      '..KKKGGGGGGKKK..',
      '.KTTKGGGGGGKTTK.',
      'KTTTKggggggKTTTK',
      'KKTGGGWWGGGTKK..',
      '.KGGGGWWGGGGK...',
      '.KTGGGGGGGGTK...',
      'KTTKggggggKTTK..',
      'KKKKGGGGGGKKKK..'
    ] },
    // 螟虫之母·元神：「那矮小身影，赫然是螟虫之母元神幻化的女童」→
    //   头 8 宽 8 行、身体 4 宽 6 行，差一倍才读得出是小孩。头发只给 3 行
    //   （5 行会把脸压没），眼睛 2x2 整块不画瞳（瞳在眼角会左右不对称，读成斜视）。
    //   发近黑 + 脸苍白 + 深眼窝：第一版用了亮绿眼和腮红，读成青蛙绿娃娃。
    //   她是封在晶核里的元神，不是吉祥物。不画虫子形态 —— 出场的就是女童
    { name: 'mingchong', pal: { K: '#0a0d0c', H: '#14171a', S: '#cdd4c4', E: '#2a3a2e', G: '#2e4038', g: '#1c2822' }, rows: [
      '..KHHHHHHK..',
      '.KHHHHHHHHK.',
      '.KHHHHHHHHK.',
      '.KHHHHHHHHK.',
      '.KHHHHHHHHK.',
      '.KSEESSEESK.',
      '.KSEESSEESK.',
      '.KSSSKKSSSK.',
      '..KKGGGGKK..',
      '...KggggK...',
      '...KGGGGK...',
      '...KGGGGK...',
      '...KggggK...',
      '...KggggK...'
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

  // ---------- 鬼谷水墨 · 精灵墨阶重绘 ----------
  // 只换 UI 不够：一屏里界面已是宣纸墨线，主角和敌人还是满饱和的彩色像素小人，
  // 那一眼就"脏"。这里给每张精灵另烘一张「墨阶 + 浅绛设色」版本，切皮时零成本换用。
  //
  // 不是简单压灰：袍色是识别符（外门绿、元婴紫、邪修红），压灰就认不出人了。
  // 走的是国画「随类赋彩」——色相留着，饱和度压到矿物档（朱砂/赭石/枯黄/石绿/花青/墨紫），
  // 明度按墨阶走：亮处归宣纸、暗处归浓墨。既有墨分五色，又留得住"水墨里一点惊艳"。
  const MINERAL = [        // 按色相下界排好，取"最后一个不超过 h 的"
    [  0, 176,  58,  44],  // 朱砂
    [ 24, 156,  98,  56],  // 赭石
    [ 52, 148, 128,  74],  // 枯黄
    [ 95,  94, 122,  88],  // 石绿
    [175,  70, 104, 122],  // 花青
    [255, 116,  86, 138]   // 墨紫（比原来提纯一档：0.07 的饱和度在纸上读不出是紫）
  ];
  const MO = [239, 233, 219],  // 宣纸白
        M1 = [185, 179, 164],  // 淡墨
        M2 = [124, 118, 105],  // 中墨
        M3 = [ 74,  70,  61],  // 重墨
        M4 = [ 32,  29,  24];  // 浓墨（轮廓）

  function mixc(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }
  function hslOf(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    const l = (mx + mn) / 2;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    let h = 0;
    if (d !== 0) {
      if (mx === r) h = ((g - b) / d) % 6;
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return [h, s, l];
  }
  // 单像素归色：低饱和走墨阶五色，高饱和先取矿物色再按明度并到墨阶里
  //
  // 画精灵时踩过的两个坑，写在这里省得再踩：
  // ① 1px 的识别特征别贴最外缘 —— inkSprite 会给边缘补一圈浓墨轮廓，贴在边上的那格直接被覆盖掉
  //    （陇家老祖的金肩章、鸾鸣门的赤凤羽、元刹的双角都这么丢过一次）。往里收一格才留得住。
  // ② 红要压在 h≈0~12 之间。h≈345~360 的"深红"在色相环上归的是墨紫档，
  //    墨化后跟黑魔修并成一片 —— 元瑶的腰带、血光圣祖的赤目都吃过这个亏。
  function inkPixel(r, g, b) {
    const hsl = hslOf(r, g, b), h = hsl[0], s = hsl[1], l = hsl[2];
    if (l < 0.13) return M4;                       // 深色一律浓墨（原描边是深蓝黑，必须归墨）
    // 近中性色不能一棍子打成灰：白袍/面纱/银发原本靠"是哪种白"区分，
    // 全归同一档之后四个人就只剩一个轮廓。国画本来就有淡彩设色（淡青/淡赭/淡花青），
    // 所以 s 在 0.07~0.17 之间按色相掺一档淡彩；s<0.07 才是真无彩，仍走纯墨阶，纸不会发脏。
    if (s < 0.17) {
      const base = l > 0.74 ? MO : l > 0.58 ? M1 : l > 0.40 ? M2 : l > 0.22 ? M3 : M4;
      const tint = s < 0.07 ? 0 : (s - 0.07) / 0.10;
      if (tint <= 0) return base;
      let mc = MINERAL[0];
      for (const m of MINERAL) { if (h >= m[0]) mc = m; }
      return mixc(base, [mc[1], mc[2], mc[3]], tint * (l > 0.74 ? 0.30 : 0.24));
    }
    let c = MINERAL[0];
    for (const m of MINERAL) { if (h >= m[0]) c = m; }
    const col = [c[1], c[2], c[3]];
    // 肤色单列一档：赭石相、中高饱和、中高明度。
    // 不单列的话，一张脸和白袍在纸上归到同一个宣纸白，人就只剩个黑轮廓，认不出是谁。
    const skin = h >= 10 && h <= 46 && s > 0.20 && l > 0.52;
    const k = skin ? 0.34 : 0.18;                   // 高明度档的掺色比例
    if (l > 0.74) return mixc(MO, col, k);          // 高明度：留白，只留一丝色
    if (l > 0.60) return mixc(M1, col, skin ? 0.58 : 0.45);   // 亮面
    if (l > 0.42) return mixc(M2, col, 0.55);      // 中间调
    if (l > 0.24) return mixc(M3, col, 0.45);      // 暗面
    return mixc(M4, col, 0.30);                     // 极暗：浓墨里透一点色
  }
  function inkSprite(src) {
    const w = src.width, h = src.height;
    if (!w || !h || !src.getContext) return src;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext && c.getContext('2d');
    if (!x || !x.getImageData) return src;          // 测试垫片没有像素 API：原样返回
    let img;
    try {
      x.drawImage(src, 0, 0);
      img = x.getImageData(0, 0, w, h);
    } catch (e) { return src; }
    const p = img.data, n = w * h;
    const solid = new Uint8Array(n);
    for (let i = 0; i < n; i++) solid[i] = p[i * 4 + 3] > 8 ? 1 : 0;
    // 有描边的精灵先按原样归色，再决定要不要补轮廓
    const out = new Float32Array(n * 3);
    let edgeDark = 0, edgeAll = 0, area = 0;
    for (let i = 0; i < n; i++) {
      if (!solid[i]) continue;
      area++;
      const k = i * 4;
      const rgb = inkPixel(p[k], p[k + 1], p[k + 2]);
      out[i * 3] = rgb[0]; out[i * 3 + 1] = rgb[1]; out[i * 3 + 2] = rgb[2];
    }
    // 轮廓检测：边缘像素里已经够黑的比例（原图自带的 K 描边）
    for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
      const i = y * w + xx;
      if (!solid[i]) continue;
      const l = (out[i * 3] + out[i * 3 + 1] + out[i * 3 + 2]) / 3;
      if (xx > 0 && solid[i - 1] && xx < w - 1 && solid[i + 1] &&
          y > 0 && solid[i - w] && y < h - 1 && solid[i + w]) continue;
      edgeAll++;
      if (l < 90) edgeDark++;
    }
    // 统一 1px 浓墨轮廓：只对「够大 + 原本没描边」的精灵补，图标太小补一圈就吃没了
    if (area >= 64 && edgeAll > 0 && edgeDark / edgeAll < 0.45) {
      for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
        const i = y * w + xx;
        if (!solid[i]) continue;
        if ((xx > 0 && solid[i - 1]) && (xx < w - 1 && solid[i + 1]) &&
            (y > 0 && solid[i - w]) && (y < h - 1 && solid[i + w])) continue;
        out[i * 3] = M4[0]; out[i * 3 + 1] = M4[1]; out[i * 3 + 2] = M4[2];
      }
    }
    for (let i = 0; i < n; i++) {
      const k = i * 4;
      if (!solid[i]) { p[k + 3] = 0; continue; }
      p[k] = out[i * 3]; p[k + 1] = out[i * 3 + 1]; p[k + 2] = out[i * 3 + 2]; p[k + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    return c;
  }
  const inkCache = new WeakMap();   // 原画布 → 墨化画布（同一张只烘一次）
  function inkOf(src) {
    if (!src || !src.width) return src;
    let v = inkCache.get(src);
    if (v === undefined) {
      try { v = inkSprite(src); } catch (e) { v = src; }
      inkCache.set(src, v);
    }
    return v || src;
  }
  // 用 Proxy 接一层：游戏里 40 多处 Sprites[name] 一处都不用改，
  // 皮肤一开就整体换墨版，关掉立刻回原色。
  window.Sprites = new Proxy(map, {
    get(t, k) {
      const v = t[k];
      if (v && typeof v === 'object' && v.width > 0 && window.SKIN_INK === true) return inkOf(v);
      return v;
    },
    set(t, k, v) { t[k] = v; return true; }
  });
  window.__inkSprite = inkOf;   // 验收脚本用

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
