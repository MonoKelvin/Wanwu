/**
 * 生成 _gen-world-catalog-data.mjs
 * node scripts/_assemble-world-catalog-data.mjs
 */
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const dir = dirname(fileURLToPath(import.meta.url))

function d(p1, l2, p2, l3, p3) {
  return `${p1}\n\n${l2}：${p2}\n\n${l3}：${p3}`
}

function esc(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r\n/g, '\\n')
    .replace(/\n/g, '\\n')
}

function fmtEntry([slug, cat, sub, name, summary, p1, l2, p2, l3, p3, tags, specs]) {
  const tagsStr = tags.map((t) => `'${esc(t)}'`).join(', ')
  const specLines = Object.entries(specs)
    .map(([k, v]) => `    ${k}: '${esc(String(v))}',`)
    .join('\n')
  return `  [
    '${esc(slug)}',
    '${esc(cat)}',
    '${esc(sub)}',
    '${esc(name)}',
    '${esc(summary)}',
    d(
      '${esc(p1)}',
      '${esc(l2)}',
      '${esc(p2)}',
      '${esc(l3)}',
      '${esc(p3)}'
    ),
    [${tagsStr}],
    {
${specLines}
    },
  ]`
}

function e(slug, cat, sub, name, summary, p1, l2, p2, l3, p3, tags, specs) {
  return [slug, cat, sub, name, summary, p1, l2, p2, l3, p3, tags, specs]
}

// hero-dc + hero-other（24 条，与 _gen-library-catalog-world-items 一致）
const REST = [
  e('hero-flash-dc', 'superhero', 'hero-dc', '闪电侠 The Flash', '巴里·艾伦获神速力，成为中央城守护者，DC 多元宇宙与平行世界关键。', '闪电侠（The Flash）1940 年《Flash Comics》#1 登场，巴里·艾伦（Barry Allen）为法医，闪电击中化学药品获神速力（Speed Force）。可超速移动、穿越时间、产生闪电。', '影视', 'CW 剧集与 DCEU《正义联盟》由埃兹拉·米勒饰演引发讨论。闪电侠重启事件影响 DC continuity。', '能力要点', '神速力、时间旅行、振动穿墙', ['DC', '神速力', '中央城', '巴里'], { 宇宙: 'DC 漫画', 首次登场: '1940', 本名: '巴里·艾伦', 能力: '神速力', 城市: '中央城', 宿敌: '逆闪' }),
  e('hero-aquaman-dc', 'superhero', 'hero-dc', '海王 Aquaman', '亚特兰蒂斯国王亚瑟·库瑞，统治七海，三叉戟与海洋沟通能力的 DC 英雄。', '海王（Aquaman）1941 年《More Fun Comics》#73 登场，亚瑟·库瑞（Arthur Curry）为人类与亚特兰蒂斯混血，可水下呼吸、与海洋生物沟通，持三叉戟统治亚特兰蒂斯。', '影视', '杰森·莫玛 DCEU 版重塑粗犷形象，《海王》票房成功。与温子仁导演合作强化奇幻海底视觉。', '能力要点', '水下生存、超级力量、三叉戟、海兽指挥', ['DC', '亚特兰蒂斯', '海洋', '三叉戟'], { 宇宙: 'DC 漫画', 首次登场: '1941', 本名: '亚瑟·库瑞', 王国: '亚特兰蒂斯', 武器: '三叉戟', 饰演: '杰森·莫玛' }),
  e('hero-green-lantern', 'superhero', 'hero-dc', '绿灯侠 Green Lantern', '情感光谱之绿光军团成员，意志驱动戒指具现化万物。', '绿灯侠（Green Lantern）1940 年 Alan Scott 版，1959 年 Hal Jordan 重启为宇宙警察。绿灯戒指由守护者授予，以意志能量战斗，需定期充电。', '相关', '成员含 John Stewart、Kyle Rayner 等。宿敌黄灯恐惧、光谱战争等宏大叙事。', '能力要点', '意志能量构型、飞行、宇宙巡逻', ['DC', '绿灯军团', '戒指', '意志'], { 宇宙: 'DC 漫画', 首次登场: '1940/1959', 代表: '哈尔·乔丹', 组织: '绿灯军团', 弱点: '黄色（早期设定）', 能源: '中央电池' }),
  e('hero-shazam-dc', 'superhero', 'hero-dc', '沙赞 Shazam', '少年比利·巴特森念「沙赞」变身六神之力成年英雄，魔法与童趣并存。', '沙赞（Shazam）原名 Captain Marvel，1939 年 Fawcett 出版，后归 DC。比利·巴特森为孤儿，巫师沙赞赐予咒语召唤宙斯等六神之力变身。', '影视', '2019 电影以家庭喜剧风格呈现，与《黑亚当》共享世界观。', '能力要点', '六神之力、雷电、飞行、魔法抗性', ['DC', '魔法', '少年', '沙赞'], { 宇宙: 'DC 漫画', 首次登场: '1939', 咒语: 'Shazam', 本名: '比利·巴特森', 特点: '少年变身', 电影: '2019《沙赞！》' }),
  e('hero-nightwing-dc', 'superhero', 'hero-dc', '夜翼 Nightwing', '迪克·格雷森脱离罗宾身份后的独立英雄，布鲁德海文守护者。', '夜翼（Nightwing）1984 年确立名号，迪克·格雷森（Dick Grayson）为首任罗宾，后成为夜翼，以杂技与双棍战斗。基地布鲁德海文（Blüdhaven）。', '相关', '性格阳光、团队领袖气质，Teen Titans 核心。', '能力要点', '杂技、侦探辅助、双棍格斗', ['DC', '夜翼', '迪克', '前罗宾'], { 宇宙: 'DC 漫画', 首次登场: '1984（名号）', 本名: '迪克·格雷森', 前身份: '罗宾', 城市: '布鲁德海文', 导师: '蝙蝠侠' }),
  e('hero-green-arrow-dc', 'superhero', 'hero-dc', '绿箭侠 Green Arrow', '奥利弗·奎因亿万富翁弓箭手，星城义警与社会正义议题结合。', '绿箭侠（Green Arrow）1941 年登场，奥利弗·奎因（Oliver Queen）流落荒岛练弓，回归星城打击犯罪。箭技与蝙蝠侠战术头脑相当。', '影视', 'CW《绿箭侠》开启 Arrowverse，探讨阶级与政治。', '能力要点', '神射、战术箭、格斗、财富资源', ['DC', '弓箭', '星城', '奥利弗'], { 宇宙: 'DC 漫画', 首次登场: '1941', 本名: '奥利弗·奎因', 城市: '星城', 搭档: '黑金丝雀', 剧集: 'CW Arrowverse' }),
  e('hero-harley-quinn', 'superhero', 'hero-dc', '哈莉·奎茵 Harley Quinn', '前精神病医生爱上小丑后成为反英雄，棒球棍与幽默暴力风格。', '哈莉·奎茵（Harley Quinn）1992 年《蝙蝠侠：动画系列》原创，后进入漫画主线。哈琳·奎泽尔（Harleen Quinzel）为阿卡姆心理医生，爱上小丑后成为同伙。', '影视', '玛格特·罗比 DCEU 塑造独立女性反英雄形象，《猛禽小队》《自杀小队》受欢迎。', '能力要点', '体操、钝器、战术不可预测性', ['DC', '反英雄', '小丑', '哈莉'], { 宇宙: 'DC 漫画', 首次登场: '1992（动画）', 职业: '前精神病医生', 武器: '球棒、枪械', 饰演: '玛格特·罗比', 特点: '幽默暴力' }),
  e('hero-joker-dc', 'superhero', 'hero-dc', '小丑 Joker', '哥谭犯罪王子，蝙蝠侠宿敌，无固定起源的混乱象征。', '小丑（Joker）1940 年《蝙蝠侠》#1 登场，真实身份成谜。以化学药剂或创伤版本多样，代表无政府式混乱与蝙蝠侠秩序对立。', '影视', '希斯·莱杰、华金·菲尼克斯等奥斯卡级演绎。', '能力要点', '高智商、化学武器、心理战；无超人体能', ['DC', '反派', '哥谭', '混乱'], { 宇宙: 'DC 漫画', 首次登场: '1940', 城市: '哥谭', 宿敌: '蝙蝠侠', 特点: '无固定起源', 饰演: '希斯·莱杰等' }),
  e('hero-cyborg-dc', 'superhero', 'hero-dc', '钢骨 Cyborg', '维克多·斯通半人半机械，母盒科技赋予联网与能量炮能力。', '钢骨（Cyborg）1980 年登场，维克多·斯通（Victor Stone）经母盒（Mother Box）改造，身体机械融合，可 Boom Tube 传送、黑客联网。', '影视', 'DCEU《正义联盟》中由雷·费舍饰演，原为少年泰坦成员。', '能力要点', '机械臂炮、飞行、黑客、母盒科技', ['DC', '机械', '正义联盟', '维克多'], { 宇宙: 'DC 漫画', 首次登场: '1980', 本名: '维克多·斯通', 科技: '母盒', 所属: '正义联盟 / 少年泰坦', 特点: '人机融合' }),
  e('hero-martian-manhunter', 'superhero', 'hero-dc', '火星猎人 Martian Manhunter', '荣恩·哈扎特，火星最后幸存者，变形、心灵感应与相位穿墙。', '火星猎人（Martian Manhunter）1955 年《侦探漫画》#225 登场，荣恩·哈扎特（J’onn J’onzz）为火星绿种人，火焰为心理弱点。能力含变形、飞行、心灵感应、相位化。', '相关', '正义联盟长期成员，动画《正义联盟》配音经典。', '能力要点', '变形、心灵感应、飞行、相位', ['DC', '火星', '心灵感应', '荣恩'], { 宇宙: 'DC 漫画', 首次登场: '1955', 本名: '荣恩·哈扎特', 弱点: '火焰（心理）', 所属: '正义联盟', 特点: '火星幸存者' }),
  e('hero-constantine-dc', 'superhero', 'hero-dc', '康斯坦丁 Constantine', '约翰·康斯坦丁，狡猾驱魔术士，烟与风衣的英伦神秘学反英雄。', '康斯坦丁（John Constantine）1985 年《沼泽怪物》#37 由 Alan Moore 等创作，属 Vertigo/DC 黑暗魔法线。驱魔、占卜、以诡计对抗地狱势力。', '影视', '基努·里维斯电影与 Matt Ryan 剧集塑造经典形象。', '能力要点', '魔法仪式、恶魔契约、策略欺骗', ['DC', '魔法', '驱魔', '反英雄'], { 宇宙: 'DC / Vertigo', 首次登场: '1985', 本名: '约翰·康斯坦丁', 职业: '驱魔师', 弱点: '人性自私（剧情）', 饰演: '基努·里维斯 / Matt Ryan' }),
  e('hero-raven-dc', 'superhero', 'hero-dc', '渡鸦 Raven', '阿泽拉特之女，掌控黑暗能量与情感的少年泰坦 mystic。', '渡鸦（Raven）1980 年与钢骨同刊登场，蕾文（Raven）为恶魔三宫（Trigon）之女，抑制情感以控制 soul-self 能量。少年泰坦核心成员。', '相关', '动画《少年泰坦》系列使角色家喻户晓。', '能力要点', '灵魂体投射、传送、情感魔法', ['DC', '少年泰坦', '魔法', '渡鸦'], { 宇宙: 'DC 漫画', 首次登场: '1980', 父亲: '三宫 Trigon', 所属: '少年泰坦', 特点: '情感抑制', 能力: '黑暗能量' }),
  e('hero-spawn', 'superhero', 'hero-other', '再生侠 Spawn', 'Image 漫画阿尔·西蒙斯死后与地狱契约重生，地狱斗篷与锁链的黑暗英雄。', '再生侠（Spawn）1992 年 Todd McFarlane 为 Image 漫画创作，阿尔·西蒙斯（Al Simmons）遭暗杀后与恶魔马勒博吉亚签约复活，获得活体战衣 Necroplasm 与地狱魔力。', '风格', '融合恐怖、宗教与街头暴力。', '设定要点', '地狱契约、活体战衣、斗篷攻击', ['Image', '黑暗英雄', '地狱', '契约'], { 出版: 'Image Comics', 首次登场: '1992', 创作者: 'Todd McFarlane', 本名: '阿尔·西蒙斯', 特点: '恐怖黑暗风', 版权: 'McFarlane' }),
  e('hero-invincible', 'superhero', 'hero-other', '无敌少侠 Invincible', '马克·格雷森发现父亲 Omni-Man 外星真相的残酷成长。', '无敌少侠（Invincible）2003 年漫画，2021 年 Amazon Prime 动画爆红。马克·格雷森（Mark Grayson）16 岁获 Viltrumite 血统超能力，父亲全能侠实为征服地球先驱。', '叙事', '动画以极端暴力与家庭剧并重，颠覆传统少年英雄叙事。', '设定要点', '飞行、力量、太空种族政治', ['Image', '动画', '亚马逊', '成长'], { 出版: 'Image / Skybound', 首次登场: '2003', 作者: 'Robert Kirkman', 主角: '马克·格雷森', 动画: '2021 Prime Video', 主题: '父辈与暴力' }),
  e('hero-hellboy', 'superhero', 'hero-other', '地狱男爵 Hellboy', '恶魔之子为 BPRD 调查超自然现象的 Right Hand of Doom。', '地狱男爵（Hellboy）1993 年 Dark Horse 漫画，由纳粹仪式召唤的恶魔之子被盟军收养，右手为毁灭之石，隶属超自然调查局 BPRD。', '影视', '哥特美术与民间传说融合。吉尔莫·德尔·托罗电影两部曲口碑极高。', '设定要点', '超级力量、神秘学调查、断角', ['Dark Horse', '恶魔', 'BPRD', '奇幻'], { 出版: 'Dark Horse', 首次登场: '1993', 创作者: 'Mike Mignola', 机构: 'BPRD', 特点: '哥特怪物风', 电影: '吉尔莫·德尔·托罗' }),
  e('hero-witcher-geralt', 'superhero', 'hero-other', '猎魔人杰洛特 Geralt', '变异猎魔人行走道德灰色世界，剑术与法印对抗怪物。', '杰洛特（Geralt of Rivia）源自波兰作家 Andrzej Sapkowski 的《猎魔人》系列，经 CD Projekt RED《巫师》游戏与 Netflix 剧集全球知名。白发、猫瞳，以剑术与法印对抗怪物。', '主题', '探讨命运、种族政治与父性（希里）。', '设定要点', '剑术、法印、炼金药剂', ['猎魔人', '奇幻', 'Netflix', '游戏'], { 来源: '波兰文学', 作者: 'Andrzej Sapkowski', 职业: '猎魔人', 标志: '白发、两剑', 游戏: 'CDPR《巫师》', 主题: '道德灰色' }),
  e('hero-tmnt-leonardo', 'superhero', 'hero-other', '忍者神龟 Leonardo', '四龟之首，双刀忍者，纽约下水道英雄与披萨文化符号。', '忍者神龟（TMNT）1984 年独立漫画，莱昂纳多（Leonardo）为戴蓝眼罩、双刀队长，性格严谨。与拉斐尔、米开朗基罗、多纳泰罗共战施莱德。', '文化', '动画、电影、玩具横跨数十年流行文化。', '设定要点', '忍术、双刀、团队领袖', ['TMNT', '忍者', '乌龟', '纽约'], { 首次登场: '1984', 创作者: 'Eastman / Laird', 角色: '莱昂纳多', 武器: '双刀', 宿敌: '施莱德', 文化: '披萨与滑板' }),
  e('hero-watchmen-rorschach', 'superhero', 'hero-other', '罗夏 Rorschach', '《守望者》道德绝对主义蒙面侦探，面具墨渍可变。', '罗夏（Rorschach）1986 年《守望者》#1 登场，沃尔特·科瓦克斯戴墨迹面具，信奉绝对正义，拒绝妥协导致悲剧结局。', '相关', '作品解构超级英雄神话，获雨果奖。', '设定要点', '侦探、格斗、格洛克手枪；无超能力', ['守望者', 'DC', '反英雄', '解构'], { 作品: 'Watchmen', 作者: 'Alan Moore', 首次登场: '1986', 本名: '沃尔特·科瓦克斯', 特点: '道德绝对', 荣誉: '雨果奖' }),
  e('hero-homelander', 'superhero', 'hero-other', '祖国人 Homelander', '《黑袍纠察队》Vought 招牌英雄，表面正义实则自恋残暴。', '祖国人（Homelander）Garth Ennis《黑袍纠察队》漫画，Amazon 剧集由安东尼·斯塔尔饰演。拥有超人般飞行、热视线、力量，但缺乏真正同理心。', '主题', '讽刺超级英雄产业化、媒体操控与粉丝文化。', '设定要点', '飞行、热视线、超级力量；心理病态', ['黑袍纠察队', '讽刺', '反派', 'Vought'], { 作品: 'The Boys', 公司: 'Vought International', 特点: '超人讽刺', 剧集: 'Amazon Prime', 饰演: '安东尼·斯塔尔' }),
  e('hero-kick-ass', 'superhero', 'hero-other', '海扁王 Kick-Ass', '无超能力少年穿制服打击犯罪引发模仿者。', '《海扁王》（Kick-Ass）2008 年漫画，戴夫·利泽夫斯基无能力却穿绿色制服，被揍后引发网络效应，超杀女与大老爹加入。', '风格', '写实暴力与 Meta 吐槽超级英雄电影套路。', '设定要点', '无超能力、棍棒格斗、网络成名', ['马克米勒', '写实', '喜剧', '暴力'], { 作者: 'Mark Millar', 首次登场: '2008', 主角: '戴夫·利泽夫斯基', 搭档: '超杀女', 电影: '马修·沃恩', 主题: '现实英雄' }),
  e('hero-conan', 'superhero', 'hero-other', '野蛮人柯南 Conan', '罗伯特·霍华德剑与魔法经典，西伯莱流浪战士走向王位传奇。', '柯南（Conan the Barbarian）1932 年 Pulp 杂志登场，Robert E. Howard 创造。蛮王柯南来自西伯莱，以剑、肌肉与狡诈冒险。', '影视', '施瓦辛格 1982 电影定义视觉形象。', '设定要点', '剑术、力量、盗贼技能', ['剑与魔法', '野蛮人', '奇幻', '经典'], { 作者: 'Robert E. Howard', 首次登场: '1932', 故乡: '西伯莱', 称号: '蛮王', 电影: '施瓦辛格 1982', 类型: 'Sword and Sorcery' }),
  e('hero-the-boys-butcher', 'superhero', 'hero-other', '屠夫 Billy Butcher', '《黑袍纠察队》领袖，痛恨超级英雄，冷酷复仇驱动纠察队。', '比利·屠夫（Billy Butcher）为《黑袍纠察队》人类主角，妻子 allegedly 被祖国人害死，率领 Hughie 等以阴谋与暴力对抗 Vought 英雄。', '影视', '卡尔·厄本剧集版口音与痞气深入人心。', '设定要点', '战术、枪械、阴谋', ['黑袍纠察队', '人类', '复仇', '领袖'], { 作品: 'The Boys', 本名: '比利·屠夫', 组织: 'The Boys', 宿敌: '祖国人', 饰演: '卡尔·厄本', 主题: '反英雄资本' }),
  e('hero-sailor-moon', 'superhero', 'hero-other', '水手月亮 Sailor Moon', '武内直子魔法少女经典，月野兔变身对抗黑暗王国。', '《美少女战士》（Sailor Moon）1991 年漫画，月野兔获露娜猫指引变身水手月亮，集结水手战士对抗黑暗势力。定义魔法少女战队模板。', '文化', '动画、音乐剧、真人版众多，是 90 年代流行文化符号。', '设定要点', '变身、月光能量、团队羁绊', ['魔法少女', '武内直子', '日本', '经典'], { 作者: '武内直子', 首次登场: '1991', 主角: '月野兔', 类型: '魔法少女', 影响: '战队模板', 文化: '90 年代符号' }),
  e('hero-goku', 'superhero', 'hero-other', '孙悟空 Goku', '《龙珠》赛亚人战士守护地球，超级赛亚人变身标志。', '孙悟空（Son Goku）1984 年《龙珠》连载，鸟山明创作，改编自《西游记》。赛亚人血统使其在战斗中不断突破，超级赛亚人、自在极意功等形态家喻户晓。', '影响', '全球销量巨大，动画、游戏、周边横跨数十年。', '设定要点', '气功波、变身、舞空术', ['龙珠', '赛亚人', '鸟山明', '格斗'], { 作者: '鸟山明', 首次登场: '1984', 种族: '赛亚人', 标志: '超级赛亚人', 作品: 'Dragon Ball 系列', 影响: '全球流行文化' }),
]

// —— supercar italy ——
const italyCars = [
  ['supercar-ferrari-sf90', '法拉利 SF90 Stradale', '马拉内罗插电混动旗舰，V8 双涡轮加三电机，千匹级性能。', 'Ferrari', '2019', '4.0L V8 双涡轮 + 三电机', '约 1000 hp', 'SF90 致敬 Scuderia 90 周年'],
  ['supercar-lamborghini-aventador', '兰博基尼 Aventador', 'V12 自然吸气旗舰，剪刀门与楔形车身定义兰博基尼现代语言。', 'Lamborghini', '2011', '6.5L V12 自然吸气', '约 770 hp', '后继 Revuelto 为混动 V12'],
  ['supercar-maserati-mc20', '玛莎拉蒂 MC20', '海神发动机回归超跑，蝴蝶门与中置布局重塑品牌性能形象。', 'Maserati', '2020', '3.0L V6 双涡轮 Nettuno', '约 630 hp', 'MC20 意为 MC 传承 20 年'],
  ['supercar-pagani-huayra', '帕加尼 Huayra', '手工艺术级超跑，AMG V12 与航空材料美学，限量收藏属性极强。', 'Pagani', '2011', '6.0L V12 双涡轮 AMG', '约 730 hp', 'Horacio Pagani 匠心之作'],
  ['supercar-ferrari-roma', '法拉利 Roma', '前置 V8 GT，优雅双门轿跑，致敬 50–60 年代 dolce vita 风格。', 'Ferrari', '2019', '3.9L V8 双涡轮', '约 620 hp', '命名源自罗马永恒之城'],
  ['supercar-lamborghini-revuelto', '兰博基尼 Revuelto', '首款量产混动 V12，三电机配合 LB744 平台，性能与排放平衡。', 'Lamborghini', '2023', '6.5L V12 + 三电机', '约 1015 hp', '接替 Aventador'],
  ['supercar-ferrari-f8', '法拉利 F8 Tributo', '488 后继中置 V8，空气动力学与轻量化进一步提升。', 'Ferrari', '2019', '3.9L V8 双涡轮', '约 720 hp', 'Tributo 致敬 V8 传统'],
  ['supercar-lamborghini-countach', '兰博基尼 Countach LPI 800-4', '经典楔形超跑现代复兴，混动 V12 向 Marcello Gandini 设计致敬。', 'Lamborghini', '2021', '6.5L V12 混动', '约 803 hp', 'Limited Production'],
  ['supercar-maserati-grancabrio', '玛莎拉蒂 GranCabrio', '意式敞篷 GT，声浪与奢华内饰兼顾地中海生活方式。', 'Maserati', '2024', '3.0L V6 Nettuno', '约 550 hp', '敞篷四座 GT'],
  ['supercar-alfa-romeo-33', '阿尔法·罗密欧 33 Stradale', '品牌旗舰超跑复兴，限量手工，融合意大利设计史与未来动力。', 'Alfa Romeo', '2023', '混动 / 纯电版本', '限量', '致敬 1967 33 Stradale'],
]
for (const [slug, name, summary, brand, year, eng, pow, note] of italyCars) {
  REST.push(
    e(
      slug,
      'supercar',
      'car-italy',
      name,
      summary,
      `${name}代表意大利${brand}在超跑领域的工程与美学结晶，${year} 年前后发布，搭载${eng}，综合输出${pow}。车身空气动力学与碳纤/铝混合结构为赛道与公路兼顾。\n\n意大利超跑以声浪、造型与驾驶参与感著称，${brand}在 F1 与民用车技术转化上历史悠久。`,
      '性能要点',
      `${eng}，约 ${pow}，中置或前置布局因车型而异`,
      '相关',
      `${note}；与同级法拉利、兰博基尼、玛莎拉蒂形成「意式性能三角」`,
      ['意大利', brand, '超跑', 'V8/V12'],
      { 分类: '意大利品牌', 厂商: brand, 上市: year, 发动机: eng, 功率: pow, 总部: '意大利', 备注: note }
    )
  )
}

// —— supercar germany ——
const germanyCars = [
  ['supercar-porsche-918', '保时捷 918 Spyder', '插电混动超跑三杰之一，纽北纪录创造者。', 'Porsche', '2013', '4.6L V8 + 双电机', '约 887 hp'],
  ['supercar-mercedes-amg-gt', '奔驰 AMG GT', 'SLS 后继前中置 V8，AMG 独立跑车线标志。', 'Mercedes-AMG', '2014', '4.0L V8 双涡轮', '约 585 hp'],
  ['supercar-audi-r8', '奥迪 R8', '共享兰博基尼平台的德系中置超跑，日常可用性高。', 'Audi', '2006', '5.2L V10 / V8', '约 620 hp'],
  ['supercar-bmw-m8', '宝马 M8 Competition', '豪华轿跑巅峰，四驱与 V8 双涡轮兼顾巡航与赛道。', 'BMW M', '2019', '4.4L V8 双涡轮', '约 625 hp'],
  ['supercar-porsche-taycan', '保时捷 Taycan', '德系高性能纯电标杆，800V 架构与弹射起步。', 'Porsche', '2019', '双电机纯电', '约 761 hp'],
  ['supercar-mercedes-slr', '奔驰 SLR McLaren', '奔驰与迈凯伦合作传奇，前置 V8 与 gullwing 门。', 'Mercedes-Benz', '2003', '5.4L V8 机械增压', '约 617 hp'],
  ['supercar-audi-r8-gt', '奥迪 R8 GT', '轻量化赛道取向 R8，V10 自然吸气绝唱世代。', 'Audi', '2022', '5.2L V10', '约 620 hp'],
  ['supercar-bmw-m4-csl', '宝马 M4 CSL', 'M 部门 50 周年轻量杰作，后驱纯粹驾驶。', 'BMW M', '2022', '3.0L 直六双涡轮', '约 550 hp'],
  ['supercar-porsche-gt3-rs', '保时捷 911 GT3 RS', '赛道化街车巅峰，大尾翼与 NA 高转魅力。', 'Porsche', '2022', '4.0L 水平对置六缸', '约 525 hp'],
  ['supercar-mercedes-amg-one', '奔驰 AMG ONE', 'F1 动力单元公路化，混动 V6 极限工程。', 'Mercedes-AMG', '2022', '1.6L V6 混动 F1', '约 1063 hp'],
  ['supercar-audi-e-tron-gt', '奥迪 e-tron GT', '与 Taycan 同平台电动 GT，quattro 与优雅轿跑线条。', 'Audi', '2021', '双电机纯电', '约 646 hp'],
]
for (const [slug, name, summary, brand, year, eng, pow] of germanyCars) {
  REST.push(
    e(
      slug,
      'supercar',
      'car-germany',
      name,
      summary,
      `${name}体现德国${brand}在精密工程、底盘调校与电子辅助系统上的优势，${year} 年世代代表德系性能文化：赛道数据转化为公路驾驶信心。\n\n德国超跑与 GT 强调日常可用性、高速稳定性与制动表现，在纽博格林开发文化影响下诞生众多标杆车型。`,
      '性能要点',
      `${eng}，${pow}，四驱或后驱依型号`,
      '相关',
      `与保时捷、AMG、奥迪 R8 等同属德国性能图谱；部分车型为限量或纪念版`,
      ['德国', brand, '超跑', '精密工程'],
      { 分类: '德国品牌', 厂商: brand, 上市: year, 发动机: eng, 功率: pow, 总部: '德国', 特点: '赛道基因' }
    )
  )
}

// —— supercar britain ——
const britainCars = [
  ['supercar-aston-martin-db11', '阿斯顿·马丁 DB11', '英伦 GT 旗舰，V12 与 V8 传承詹姆斯·邦德气质。', 'Aston Martin', '2016', '5.2L V12 / 4.0 V8', '约 630 hp'],
  ['supercar-bentley-continental-gt', '宾利欧陆 GT', '奢华与 W12 双涡轮速度的结合，手工内饰典范。', 'Bentley', '2003', '6.0L W12 双涡轮', '约 650 hp'],
  ['supercar-lotus-emira', '路特斯 Emira', '末代燃油路特斯，中置布局与轻量化哲学延续。', 'Lotus', '2021', 'V6 / 四缸 turbo', '约 400 hp'],
  ['supercar-jaguar-f-type', '捷豹 F-Type', '英伦声浪代表，敞篷与轿跑多形态。', 'Jaguar', '2013', 'V8 / 四缸', '约 575 hp'],
  ['supercar-mclaren-artura', '迈凯伦 Artura', '混动 V6 新平台，英国超跑电气化转折点。', 'McLaren', '2021', '3.0L V6 混动', '约 680 hp'],
  ['supercar-mclaren-p1', '迈凯伦 P1', '混动超跑三杰，碳纤 MonoCell 与 Instant Power Assist。', 'McLaren', '2013', '3.8L V8 混动', '约 916 hp'],
  ['supercar-aston-valkyrie', '阿斯顿·马丁 Valkyrie', '与 Red Bull 合作空气动力学怪兽，赛道优先。', 'Aston Martin', '2021', '6.5L V12 混动', '约 1160 hp'],
  ['supercar-mclaren-senna', '迈凯伦 Senna', '以塞纳命名，900kg 级下压力赛道机器。', 'McLaren', '2018', '4.0L V8 双涡轮', '约 800 hp'],
  ['supercar-bentley-batur', '宾利 Batur', 'W12 绝版奢华轿跑，Mulliner 定制限量。', 'Bentley', '2022', '6.0L W12 双涡轮', '约 750 hp'],
  ['supercar-lotus-evija', '路特斯 Evija', '英国纯电超跑，2000hp 级四电机目标。', 'Lotus', '2021', '四电机纯电', '约 2000 hp'],
  ['supercar-jaguar-xj220', '捷豹 XJ220', '90 年代极速纪录传奇，V6 双涡轮中置。', 'Jaguar', '1992', '3.5L V6 双涡轮', '约 542 hp'],
]
for (const [slug, name, summary, brand, year, eng, pow] of britainCars) {
  REST.push(
    e(
      slug,
      'supercar',
      'car-britain',
      name,
      summary,
      `${name}承载英国${brand}在轻量化、空气动力学或奢华手工方面的传统，${year} 年代表英伦跑车从经典 GT 到现代混动/纯电的演进。\n\n英国超跑品牌常具小规模量产、赛车血统与定制服务特色，在古德伍德、银石等赛车文化中孕育。`,
      '性能要点',
      `${eng}，${pow}`,
      '相关',
      '与迈凯伦、阿斯顿·马丁、宾利等构成英国性能车谱系',
      ['英国', brand, '超跑', 'GT'],
      { 分类: '英国品牌', 厂商: brand, 上市: year, 发动机: eng, 功率: pow, 总部: '英国', 传统: '赛车血统' }
    )
  )
}

// —— plants aroid ——
const aroids = [
  ['plant-philodendron', '蔓绿绒 Philodendron', '天南星科藤本观叶，心形叶与气生根，室内攀爬热植代表。', '喜暖湿', '明亮散射光', '保持介质微湿'],
  ['plant-alocasia', '海芋 Alocasia', '大象耳大型叶，块茎贮藏，品种纹理丰富。', '20–30°C', '耐阴忌暴晒', '冬季减少浇水'],
  ['plant-pothos', '绿萝 Epipremnum', '耐阴好养入门藤本，金边与大理石斑品种流行。', '适应性强', '散射光至半阴', '见干见湿'],
  ['plant-anthurium', '红掌 Anthurium', '蜡质佛焰苞与肉穗花序，花期长适合室内观赏。', '高湿度', '明亮无直射', '通风防叶斑'],
  ['plant-caladium', '彩叶芋 Caladium', '块茎季性观叶，夏季叶色鲜艳冬季休眠。', '温暖', '半阴', '休眠停肥少水'],
  ['plant-zz-plant', '金钱树 ZZ Plant', '厚叶耐旱耐阴，办公室绿植热门。', '耐旱', '低光可活', '忌积水烂根'],
  ['plant-syngonium', '合果芋 Syngonium', '箭形叶随龄裂变，粉色系品种网红。', '热带', '散射光', '定期擦叶除尘'],
  ['plant-scindapsus', '绿萝藤 Scindapsus', '银斑藤本，与绿萝近缘但叶质厚实。', '攀援', '明亮间接光', '水苔柱促大叶'],
  ['plant-hoya', '球兰 Hoya', '蜡质叶与伞形花序，花香浓郁需充足光开花。', '多肉状叶', '明亮光', '控水促花'],
  ['plant-peace-lily', '白掌 Spathiphyllum', '白色佛焰苞，蒸腾作用强可指示缺水。', '耐阴', '散射光', '缺水会萎蔫再浇水恢复'],
]
for (const [slug, name, summary, temp, light, water] of aroids) {
  REST.push(
    e(
      slug,
      'plant',
      'plant-aroid',
      name,
      summary,
      `${name}属天南星科观叶或开花类，在热带雨林底层或附生环境中演化，现代温室与室内栽培需模拟高湿与排水良好介质。\n\n叶片形态与斑纹为选育重点，气生根可引导攀附水苔柱以增大叶面积。`,
      '养护要点',
      `温度 ${temp}；光照 ${light}；浇水 ${water}`,
      '相关',
      '与龟背竹、春羽等同科；网红「热植」社群常交流配土与湿度',
      ['观叶', '天南星科', '室内', '热植'],
      { 分类: '天南星科', 光照: light, 温度: temp, 浇水: water, 湿度: '中至高', 繁殖: '扦插 / 分株', 注意: '忌长期积水' }
    )
  )
}

// —— plants succulent ——
const succulents = [
  ['plant-aloe-vera', '芦荟 Aloe vera', '药用凝胶多肉，耐旱强光，盆栽易繁殖。'],
  ['plant-haworthia', '十二卷 Haworthia', '窗面透光的小型多肉，桌面耐阴。'],
  ['plant-lithops', '生石花 Lithops', '拟态「活石头」，休眠期极控水。'],
  ['plant-cactus', '仙人掌 Cactus', '茎肉质储水，刺座演化，沙漠景观主角。'],
  ['plant-sedum', '景天 Sedum', '多肉质叶，地被或盆栽，繁殖极易。'],
  ['plant-string-of-pearls', '佛珠 String of Pearls', '垂吊珠状叶，需明亮光与通风。'],
  ['plant-crassula', '青锁龙 Crassula', '玉树属常见，玉树、钱串等品种多样。'],
  ['plant-agave', '龙舌兰 Agave', '大型肉质莲座，多年生长开花枯死。'],
  ['plant-kalanchoe', '长寿花 Kalanchoe', '短日照开花多肉，节日盆栽常见。'],
  ['plant-graptopetalum', '风车草 Graptopetalum', '粉紫色调莲座，杂交拟石莲流行。'],
]
for (const [slug, name, summary] of succulents) {
  REST.push(
    e(
      slug,
      'plant',
      'plant-succulent',
      name,
      summary,
      `${name}通过肉质组织储水适应干旱环境，原生多分布于非洲、中美洲及墨西哥等地。栽培核心为「充足光照 + 排水介质 + 控水防烂根」。\n\n生长季春至秋可薄肥，冬季多数品种减缓代谢需减少浇水。叶插与分株为常见繁殖方式。`,
      '养护要点',
      '颗粒土占比 50–80%；浇水见干见湿；夏季遮烈日防灼伤',
      '相关',
      '与景天科、仙人掌科混栽需注意需水量差异',
      ['多肉', '耐旱', '盆栽', '室内'],
      { 分类: '多肉植物', 光照: '明亮直射至半日照', 介质: '排水颗粒土', 浇水: '干透再浇', 繁殖: '叶插 / 砍头', 注意: '冬季防低温积水', 季节: '生长季春秋' }
    )
  )
}

// —— anime shonen ——
const shonen = [
  ['anime-naruto', '火影忍者 Naruto', '岸本齐史忍者长篇，鸣人追寻火影之梦的羁绊与成长。', '少年Jump', '2002 动画', '螺旋丸、影分身'],
  ['anime-dragon-ball', '龙珠 Dragon Ball', '鸟山明格斗冒险经典，超级赛亚人变身影响全球。', '少年Jump', '1986 动画', '龟派气功、赛亚人'],
  ['anime-my-hero-academia', '我的英雄学院', '堀越耕平超能力学院英雄培育，绿谷出久继承 OFA。', '少年Jump', '2016 动画', '个性、英雄社会'],
  ['anime-jujutsu-kaisen', '咒术回战', '芥见下下咒术师对抗诅咒，虎杖悠仁吞指宿傩。', '少年Jump', '2020 动画', '领域展开、咒力'],
  ['anime-chainsaw-man', '链锯人', '藤本树黑暗少年漫，电次与波奇塔契约变身。', '少年Jump', '2022 动画', '恶魔猎人、MAPPA'],
  ['anime-spy-x-family', '间谍过家家', '远藤达哉喜剧间谍家庭，阿尼亚读心萌点。', '少年Jump', '2022 动画', '伪装家庭、冷战背景'],
  ['anime-bleach', '死神 BLEACH', '久保带人死神、灭却师与虚的三界战争。', '少年Jump', '2004 动画', '斩魄刀、尸魂界'],
  ['anime-haikyuu', '排球少年！！', '古馆春一排球青春，乌野高中冲击全国。', '少年Jump', '2014 动画', '排球、团队协作'],
  ['anime-hunter-x-hunter', '全职猎人', '富坚义博猎人考试与念能力系统神作。', '少年Jump', '1999 动画', '念能力、猎人考试'],
  ['anime-blue-lock', '蓝色监狱', '金城宗幸足球心理战，培育「自私」前锋的封闭训练营。', '讲谈社', '2022 动画', '足球、心理战'],
]
for (const [slug, name, summary, pub, anime, theme] of shonen) {
  REST.push(
    e(slug, 'anime', 'anime-shonen', name, summary,
      `${name}为${pub}系少年向代表作，以热血战斗、团队羁绊与成长叙事为核心。${anime} 播出后推动全球二次文化扩散，角色招式与台词成为梗文化来源。\n\n作品在分镜、配乐与作画上常由顶级工作室操刀，引发 cosplay、同人志与手游联动产业链。`,
      '作品要点', theme, '相关', `与同期 ${pub} 王道漫并列讨论；续作与剧场版常拓展世界观`,
      ['少年漫', '热血', '日本', '动画'], { 分类: '少年向', 连载: pub, 动画: anime, 主题: theme, 受众: '少年至青年', 影响: '全球二次元' }))
}

// —— anime fantasy ——
const fantasyAnime = [
  ['anime-fullmetal-alchemist', '钢之炼金术师', '荒川弘炼金术等价交换，兄弟寻身体之旅。', '等价交换', '2003/2009 双版动画'],
  ['anime-death-note', '死亡笔记', '大场鸫×小畑健智斗，夜神月与 L 的猫鼠游戏。', '超自然笔记', '2006 动画'],
  ['anime-steins-gate', '命运石之门', '科学 ADV 时间线跳跃，冈部伦太郎拯救牧濑红莉栖。', '时间旅行', '2011 动画'],
  ['anime-howls-moving-castle', '哈尔的移动城堡', '宫崎骏吉卜力奇幻，苏菲与哈尔的魔法城堡。', '吉卜力', '2004 电影'],
  ['anime-sword-art-online', '刀剑神域', '川原砾 VRMMO 死亡游戏，桐人与亚丝娜。', '虚拟现实', '2012 动画'],
  ['anime-made-in-abyss', '来自深渊', '土笔章人黑暗奇幻，深渊诅咒与探险残酷美学。', '探险黑暗', '2017 动画'],
  ['anime-frieren', '葬送的芙莉莲', '山田钟人千年精灵旅程，战后魔法使的离别与记忆。', '公路奇幻', '2023 动画'],
  ['anime-rezero', 'Re:从零开始的异世界生活', '长月达平轮回异世界，菜月昴死亡回归。', '异世界轮回', '2016 动画'],
  ['anime-mushoku-tensei', '无职转生', '理不尽な孫の手转生奇幻，鲁迪乌斯第二人生。', '异世界转生', '2021 动画'],
  ['anime-violet-evergarden', '紫罗兰永恒花园', '晓佳奈京紫自动人偶少女理解「爱」的含义。', '治愈文艺', '2018 动画'],
]
for (const [slug, name, summary, theme, anime] of fantasyAnime) {
  REST.push(
    e(slug, 'anime', 'anime-fantasy', name, summary,
      `${name}以${theme}为叙事支点，在世界观构建、角色心理与视觉风格上偏向奇幻或文艺向。${anime} 在口碑与奖项上常获高度评价，适合追求剧情深度的观众。\n\n与纯粹热血少年漫不同，本类更强调设定逻辑、情感细腻度或哲学命题。`,
      '观赏要点', theme, '相关', '常与异世界、时间线、吉卜力系或黑暗奇幻标签联动推荐',
      ['奇幻', '剧情', '日本', '深度'], { 分类: '奇幻冒险', 主题: theme, 动画: anime, 风格: '设定向 / 文艺', 受众: '青年以上', 代表要素: theme }))
}

// —— transformers autobot ——
const autobots = [
  ['tf-jazz', '爵士 Jazz', '汽车人副官，保时捷变形，热爱地球文化的谈判专家。', '保时捷', '副官'],
  ['tf-ironhide', '铁皮 Ironhide', '武器专家，皮卡变形，老兵性格刚烈。', 'GMC 皮卡', '武器专家'],
  ['tf-ratchet', '救护车 Ratchet', '汽车人军医，救护车变形，救治同伴。', '救护车', '军医'],
  ['tf-wheeljack', '千斤顶 Wheeljack', '科学家， Lancia 变形，发明火花塞与太空桥。', 'Lancia Stratos', '科学家'],
  ['tf-grimlock', '钢锁 Grimlock', '机器恐龙首领，霸王龙变形，说话简短力量惊人。', '霸王龙', '恐龙派'],
  ['tf-bumblebee-classic', '大黄蜂 G1', '大众甲壳虫侦察兵，与人类萨姆/查理情谊深厚。', '甲壳虫', '侦察兵'],
  ['tf-hot-rod', '热破 Hot Rod', '年轻战士，后继承擎天柱成为补天士。', '跑车', '领袖继承'],
  ['tf-arcee', '阿尔茜 Arcee', '女性汽车人战士，粉色流线车体，敏捷射手。', '流线跑车', '女战士'],
  ['tf-ultra-magnus', '通天晓 Ultra Magnus', '城市指挥官，集装箱卡车变形，秩序与规章象征。', '卡车', '指挥官'],
  ['tf-sideswipe', '横炮 Sideswipe', '双胞胎之一，兰博基尼变形，决斗爱好者。', '兰博基尼', '战士'],
]
for (const [slug, name, summary, alt, role] of autobots) {
  REST.push(
    e(slug, 'transformers', 'tf-autobot', name, summary,
      `${name}隶属汽车人（Autobot）阵营，由 Hasbro 与 Takara Tomy 玩具线及 1984 年动画推出。通常可变形为${alt}，在团队中担任${role}。\n\n汽车人以保护地球与人类、对抗霸天虎为使命，擎天柱为精神领袖。`,
      '变形形态', alt, '相关', '与霸天虎威震天宿敌关系；G1 动画与迈克尔·贝电影造型各异',
      ['汽车人', 'Hasbro', '变形', role], { 分类: '汽车人 Autobot', 阵营: '汽车人', 变形: alt, 角色: role, 版权: 'Hasbro / Takara', 首次: '1984' }))
}

// —— transformers decepticon ——
const decepticons = [
  ['tf-starscream', '红蜘蛛 Starscream', '霸天虎空军司令，F-15 变形，野心勃勃总想取代威震天。', 'F-15 战斗机', '空军司令'],
  ['tf-soundwave', '声波 Soundwave', '情报官，卡带战士与录音机变形，忠诚威震天。', '录音机', '情报官'],
  ['tf-shockwave', '震荡波 Shockwave', '赛博坦留守科学家，激光炮手臂，逻辑冷酷。', '手枪 / 飞船', '科学家'],
  ['tf-brawl', '吵闹 Brawl', '战车队坦克，组合金刚混天豹腿部，火力凶猛。', 'M1 坦克', '战车队'],
  ['tf-barricade', '路障 Barricade', '警车变形，迈克尔·贝电影人类对立面。', '警车', '猎手'],
  ['tf-blackout', '眩晕 Blackout', '直升机变形，电影版首个登场霸天虎。', '直升机', '突袭'],
  ['tf-lockdown', '禁闭 Lockdown', '赏金猎人，多种载具，跨阵营狩猎变形金刚。', '肌肉车', '赏金猎人'],
  ['tf-ravage', '机器狗 Ravage', '声波磁带战士，黑豹形态侦察。', '黑豹', '磁带战士'],
  ['tf-laserbeak', '激光鸟 Laserbeak', '声波磁带，鸟形侦察与暗杀。', '机械鸟', '磁带战士'],
  ['tf-devastator', '大力神 Devastator', '工程车合体金刚，六合一破坏力。', '工程车合体', '合体金刚'],
  ['tf-galvatron', '惊破天 Galvatron', '威震天重生体，宇宙大帝改造后的暴君。', '大炮 / 卡车', '霸天虎领袖'],
]
for (const [slug, name, summary, alt, role] of decepticons) {
  REST.push(
    e(slug, 'transformers', 'tf-decepticon', name, summary,
      `${name}为霸天虎（Decepticon）阵营成员，追求征服赛博坦与地球资源。变形形态常为${alt}，职能偏向${role}。\n\n与汽车人长期战争，威震天（及惊破天）为领袖；红蜘蛛等角色以背叛与阴谋著称。`,
      '变形形态', alt, '相关', '合体金刚、磁带战士为经典子系列；电影与 G1 设定有差异',
      ['霸天虎', '反派', '变形', role], { 分类: '霸天虎 Decepticon', 阵营: '霸天虎', 变形: alt, 角色: role, 领袖: '威震天 / 惊破天', 特点: role }))
}

// —— moto italy ——
const motoItaly = [
  ['motorcycle-aprilia-rsv4', '阿普利亚 RSV4', '诺阿利亚 V4 仿赛，MotoGP 技术下放。', 'Aprilia', 'V4 仿赛', '约 217 hp'],
  ['motorcycle-mv-agusta', 'MV Agusta', '意大利手工跑车美学，三缸/四缸高转。', 'MV Agusta', '三缸 / 四缸', '限量精品'],
  ['moto-ducati-streetfighter', '杜卡迪 Streetfighter V4', '裸缸 V4 街霸，Panigale 动力平台。', 'Ducati', 'V4 街车', '约 208 hp'],
  ['moto-aprilia-rs660', '阿普利亚 RS 660', '中级排量双缸仿赛，赛道入门利器。', 'Aprilia', '660 双缸', '约 100 hp'],
  ['moto-mv-agusta-superveloce', 'MV Agusta Superveloce', '复古外壳的现代三缸超跑。', 'MV Agusta', '三缸', '艺术收藏'],
  ['moto-ducati-scrambler', '杜卡迪 Scrambler', '意式 scrambler 文化，城市复古骑行。', 'Ducati', 'L 型双缸', '复古'],
  ['moto-bimota-tesi', '比摩塔 Tesi', '轮毂转向技术实验品牌，限量手工。', 'Bimota', '独特转向', '小众'],
  ['moto-guzzi-v7', '摩托古兹 V7', '横置 V 双缸经典，意大利巡航传统。', 'Moto Guzzi', 'V 双缸横置', '约 65 hp'],
  ['moto-aprilia-shiver', '阿普利亚 Shiver 900', '街车 V 双缸，城市运动骑行。', 'Aprilia', '900 V 双缸', '街车'],
  ['moto-ducati-supersport', '杜卡迪 Supersport 950', '舒适取向 V 双缸运动旅行。', 'Ducati', '937 V 双缸', '公路运动'],
  ['moto-mv-agusta-f3', 'MV Agusta F3', '三缸 800 级仿赛，紧凑暴力美学。', 'MV Agusta', '三缸 798', '约 147 hp'],
]
for (const [slug, name, summary, brand, eng, pow] of motoItaly) {
  REST.push(
    e(slug, 'motorcycle', 'moto-italy', name, summary,
      `${name}代表意大利${brand}在摩托车工程与造型上的传统：${eng}动力、精细底盘与独特排气声浪。意大利品牌常参与 MotoGP 并将赛事技术转化至民用车。\n\n博洛尼亚、瓦雷泽等产地汇聚杜卡迪、阿普利亚、MV Agusta 等名厂，以设计驱动品牌溢价。`,
      '骑行要点', `${eng}，${pow}，弯道精准`, '相关', '与日系仿赛对比更重风格与电子套件差异',
      ['意大利', brand, '摩托', '仿赛'], { 分类: '意大利品牌', 厂商: brand, 发动机: eng, 功率: pow, 总部: '意大利', 文化: 'MotoGP 血统' }))
}

// —— moto america ——
const motoAmerica = [
  ['motorcycle-indian-scout', '印第安 Scout', '美式巡航入门，复古油箱与低座高。', 'Indian', '1133 V 双缸', '巡航'],
  ['motorcycle-harley-fat-boy', '哈雷 Fat Boy', '实心盘轮经典巡航，终结者 2 同款意象。', 'Harley-Davidson', 'Milwaukee-Eight', '约 93 hp'],
  ['motorcycle-indian-chief', '印第安 Chief', '旗舰巡航，印第安羽毛帽徽标传承。', 'Indian', 'Thunderstroke', '旗舰'],
  ['moto-harley-sportster', '哈雷 Sportster S', '液冷 Revolution Max，运动巡航新世代。', 'Harley-Davidson', '1250 V 双缸', '运动巡航'],
  ['moto-indian-scout-bobber', '印第安 Scout Bobber', 'Bobber 风格硬尾视觉，城市巡航。', 'Indian', '1133 V 双缸', 'Bobber'],
  ['moto-harley-pan-america', '哈雷 Pan America', '哈雷首款 ADV，越野探索拓展用户群。', 'Harley-Davidson', '1250 V 双缸', 'ADV'],
  ['moto-indian-ftr', '印第安 FTR 1200', '扁平赛道风格街车，印第安赛车血统。', 'Indian', '1203 V 双缸', '街车'],
  ['moto-harley-livewire', '哈雷 LiveWire', '美式电摩先锋，瞬时扭矩都市骑行。', 'Harley-Davidson', '纯电', '约 105 hp'],
  ['moto-harley-road-glide', '哈雷 Road Glide', '鲨鱼鼻整流罩长途_BAGGER，高速稳定。', 'Harley-Davidson', 'Milwaukee-Eight', '旅行'],
  ['moto-indian-challenger', '印第安 Challenger', '对标哈雷滑翔系列的豪华_BAGGER。', 'Indian', 'PowerPlus', '豪华旅行'],
  ['moto-harley-low-rider-st', '哈雷 Low Rider ST', '运动旅行姿态，丹尼斯·柯克伍德设计影响。', 'Harley-Davidson', '117 V 双缸', '运动旅行'],
]
for (const [slug, name, summary, brand, eng, style] of motoAmerica) {
  REST.push(
    e(slug, 'motorcycle', 'moto-america', name, summary,
      `${name}体现美国${brand}巡航文化：${eng}，风格偏向${style}。哈雷与印第安为美国摩托车双雄，密尔沃基与明尼阿波利斯产地象征自由公路与改装文化。\n\nH.O.G. 车主会与印第安骑手社区组织大型集会，排气声浪与低座高定义美式骑行体验。`,
      '骑行要点', `${eng}，${style}，长途舒适或城市灵活因车型而异`, '相关', '与日系、欧系仿赛用户群差异大；改装件市场丰富',
      ['美式', brand, '巡航', style], { 分类: '美式巡航', 厂商: brand, 发动机: eng, 风格: style, 总部: '美国', 文化: '公路与改装' }))
}

// —— moto japan ——
const motoJapan = [
  ['motorcycle-yamaha-r1', '雅马哈 YZF-R1', '十字曲轴四缸仿赛，MotoGP 技术标杆。', 'Yamaha', '998 cc 四缸', '约 200 hp'],
  ['motorcycle-kawasaki-ninja', '川崎 Ninja ZX-10R', '绿色猛兽，WSBK 冠军常客。', 'Kawasaki', '998 cc 四缸', '约 203 hp'],
  ['motorcycle-suzuki-hayabusa', '铃木 Hayabusa', '隼式极速传奇，直列四缸长途高速。', 'Suzuki', '1340 cc 四缸', '极速传说'],
  ['motorcycle-honda-gold-wing', '本田 Gold Wing', '豪华旅行车旗舰，水平对置六缸顺滑。', 'Honda', '1833 六缸', '旅行旗舰'],
  ['moto-yamaha-mt-09', '雅马哈 MT-09', '三缸扭力大师裸车，城市乐趣机器。', 'Yamaha', '890 三缸', '约 119 hp'],
  ['moto-kawasaki-z900', '川崎 Z900', '四缸街车性价比，Z 系列街头暴力美学。', 'Kawasaki', '948 四缸', '街车'],
  ['moto-suzuki-gsx-r750', '铃木 GSX-R750', '750 仿赛经典，赛道日热门。', 'Suzuki', '750 四缸', '仿赛'],
  ['moto-honda-africa-twin', '本田 Africa Twin', 'ADV 探险标杆，达喀尔血统。', 'Honda', '1100 双缸', 'ADV'],
  ['moto-yamaha-tracer', '雅马哈 Tracer 9', '运动旅行三缸，长途舒适。', 'Yamaha', '890 三缸', '运动旅行'],
  ['moto-kawasaki-versys', '川崎 Versys 650', '多用途街旅，舒适坐姿。', 'Kawasaki', '650 双缸', '街旅'],
  ['moto-suzuki-katana', '铃木 Katana', '刀锋造型复兴，现代街车致敬 80 年代。', 'Suzuki', '1000 四缸', '街车'],
  ['moto-honda-rebel-1100', '本田 Rebel 1100', '日式 Bobber 巡航，DCT 可选。', 'Honda', '1084 双缸', '巡航'],
  ['moto-yamaha-xsr900', '雅马哈 XSR900', '复古运动三缸，咖啡赛车风格。', 'Yamaha', '890 三缸', '复古'],
]
for (const [slug, name, summary, brand, eng, style] of motoJapan) {
  REST.push(
    e(slug, 'motorcycle', 'moto-japan', name, summary,
      `${name}为日本${brand}代表作，${eng}，定位${style}。日系厂商以可靠性与高转四缸技术统治全球仿赛与街车市场，常称霸 WSBK 与 MotoGP。\n\n保养经济、配件丰富，适合赛道日与日常通勤的多场景需求。`,
      '骑行要点', `${eng}，高转性能或扭力特性因车系而异`, '相关', '与欧系意系对比更重性价比与电子辅助普及',
      ['日本', brand, '摩托', style], { 分类: '日本品牌', 厂商: brand, 发动机: eng, 定位: style, 总部: '日本', 赛事: 'MotoGP / WSBK' }))
}

// —— movies scifi ——
const movieScifi = [
  ['movie-matrix', '黑客帝国 The Matrix', '虚拟现实与红色药丸哲学，子弹时间革新动作片语法。', '1999', '沃卓斯基', '赛博朋克'],
  ['movie-blade-runner-2049', '银翼杀手 2049', '丹尼斯·维伦纽瓦延续雨夜洛杉矶反乌托邦美学。', '2017', '维伦纽瓦', '赛博朋克'],
  ['movie-interstellar', '星际穿越 Interstellar', '诺兰五维空间与父女情感，黑洞科学顾问 Kip Thorne。', '2014', '诺兰', '硬科幻'],
  ['movie-avatar', '阿凡达 Avatar', '潘多拉星球生态与 3D 电影革命，詹姆斯·卡梅隆。', '2009', '卡梅隆', '太空殖民'],
  ['movie-dune', '沙丘 Dune', '厄拉科斯香料政治，巨物美学与宗教预言。', '2021', '维伦纽瓦', '太空歌剧'],
  ['movie-2001-space-odyssey', '2001 太空漫游', '库布里克猿人至星孩史诗，HAL 9000 人工智能寓言。', '1968', '库布里克', '经典科幻'],
  ['movie-alien', '异形 Alien', '雷德利·斯科特太空恐怖，H.R. Giger 生物机械设计。', '1979', '斯科特', '太空恐怖'],
  ['movie-terminator-2', '终结者 2', 'T-1000 液态金属与施瓦辛格保护约翰·康纳。', '1991', '卡梅隆', '时空旅行'],
  ['movie-arrival', '降临 Arrival', '语言学破解外星文字，非线性时间与悲伤主题。', '2016', '维伦纽瓦', '外星接触'],
  ['movie-ex-machina', '机械姬 Ex Machina', '图灵测试与 AI 意识伦理，封闭别墅心理惊悚。', '2014', '加兰', '人工智能'],
  ['movie-district-9', '第九区 District 9', '南非外星人隔离隐喻种族隔离，伪纪录片风格。', '2009', '布洛姆坎普', '社会科幻'],
]
for (const [slug, name, summary, year, director, genre] of movieScifi) {
  REST.push(
    e(slug, 'movie', 'movie-scifi', name, summary,
      `${name}（${year}）由${director}执导，属${genre}类型里程碑。影片在视觉特效、世界观设定或科学概念上影响后续工业与流行文化。\n\n科幻片通过未来技术反思当下社会、人性与宇宙位置，常与哲学、政治议题交织。`,
      '影像风格', genre, '相关', '与同导演或同类型经典常组成观影清单；配乐与美术是学术分析热点',
      ['科幻', '电影', genre, director], { 分类: '科幻电影', 年份: year, 导演: director, 类型: genre, 语言: '英语为主', 影响: '类型标杆' }))
}

// —— movies fantasy ——
const movieFantasy = [
  ['movie-lord-of-the-rings', '指环王 The Lord of the Rings', '彼得·杰克逊中土世界三部曲，魔戒远征史诗。', '2001–03', '杰克逊', '史诗奇幻'],
  ['movie-harry-potter', '哈利·波特 Harry Potter', '霍格沃茨魔法世界，成长与伏地魔对决。', '2001–11', '多位导演', '魔法奇幻'],
  ['movie-studio-ghibli', '吉卜力动画电影', '宫崎骏与高畑勋手绘奇幻，自然与人类共存。', '1985–', '吉卜力', '动画奇幻'],
  ['movie-avatar-way-of-water', '阿凡达：水之道', '潘多拉海洋部落与家庭延续，水下拍摄技术突破。', '2022', '卡梅隆', '科幻奇幻'],
  ['movie-pan-labyrinth', '潘神的迷宫', '佛朗哥时期西班牙童话与战争残酷对照。', '2006', '德尔·托罗', '黑暗童话'],
  ['movie-princess-mononoke', '幽灵公主', '宫崎骏森林神灵与人类炼铁冲突。', '1997', '宫崎骏', '生态奇幻'],
  ['movie-labyrinth', '魔幻迷宫 Labyrinth', '大卫·鲍伊摇滚妖精王与少女迷宫冒险。', '1986', '霍尔斯特罗姆', '童话'],
  ['movie-the-wizard-of-oz', '绿野仙踪', '1939 经典彩色歌舞，桃乐茜黄砖路之旅。', '1939', '弗莱明', '经典童话'],
  ['movie-coraline', '鬼妈妈 Coraline', '莱卡定格动画，平行世界纽扣眼妈妈。', '2009', '塞尔尼克', '定格奇幻'],
  ['movie-guillermo-shape', '水形物语', '德尔·托罗冷战背景人鱼恋，奥斯卡最佳影片。', '2017', '德尔·托罗', '浪漫奇幻'],
  ['movie-fantastic-beasts', '神奇动物在哪里', '哈利·波特前传，纽特·斯卡曼德魔法生物。', '2016', '叶茨', '魔法世界'],
]
for (const [slug, name, summary, year, director, genre] of movieFantasy) {
  REST.push(
    e(slug, 'movie', 'movie-fantasy', name, summary,
      `${name}构建${genre}叙事宇宙，${year} 年间以美术、服装与配乐塑造异世界沉浸感。奇幻电影常借用神话、民间传说与魔法规则探讨善恶、成长与生态。\n\n与科幻不同，奇幻较少依赖科学解释而重象征与寓言。`,
      '世界观', genre, '相关', '与原著小说、游戏联动形成跨媒体宇宙',
      ['奇幻', '电影', genre, '史诗'], { 分类: '奇幻电影', 年份: year, 导演: director, 类型: genre, 改编: '文学 / 原创', 受众: '全年龄至成人' }))
}

// —— movies action ——
const movieAction = [
  ['movie-mad-max-fury-road', '疯狂的麦克斯：狂暴之路', '乔治·米勒废土追逐，女权与视觉动作巅峰。', '2015', '米勒', '废土动作'],
  ['movie-john-wick', '疾速追杀 John Wick', '基努·里维斯枪斗美学，大陆酒店刺客宇宙。', '2014', '斯塔赫尔斯基', '动作惊悚'],
  ['movie-godfather', '教父 The Godfather', '科波拉黑手党家族史诗，马龙·白兰度影史经典。', '1972', '科波拉', '犯罪剧情'],
  ['movie-pulp-fiction', '低俗小说 Pulp Fiction', '昆汀非线性叙事，洛杉矶黑帮与对话黑色幽默。', '1994', '昆汀', '犯罪喜剧'],
  ['movie-parasite', '寄生虫 Parasite', '奉俊昊阶级隐喻豪宅，奥斯卡最佳影片亚洲首获。', '2019', '奉俊昊', '社会惊悚'],
  ['movie-die-hard', '虎胆龙威 Die Hard', '圣诞摩天楼独夫英雄，布鲁斯·威利斯动作模板。', '1988', '麦克蒂尔南', '动作'],
  ['movie-mission-impossible', '碟中谍 Mission: Impossible', '汤姆·克鲁斯实拍特技，不可能任务局。', '1996–', '多位', '特工动作'],
  ['movie-james-bond-skyfall', '007：大破天幕杀机 Skyfall', '丹尼尔·克雷格邦德，席维斯·肖恩反派。', '2012', '萨姆·门德斯', '特工'],
  ['movie-top-gun-maverick', '壮志凌云 2：独行侠', '航母空战实拍，独行侠传承。', '2022', '约瑟夫·科辛斯基', '空战'],
  ['movie-raid', '突袭 The Raid', '印尼武术 Silat 高楼血战，动作剪辑教科书。', '2011', '加雷斯·埃文斯', '格斗'],
  ['movie-kill-bill', '杀死比尔 Kill Bill', '昆汀复仇武士风，乌玛·瑟曼新娘。', '2003', '昆汀', '武术复仇'],
]
for (const [slug, name, summary, year, director, genre] of movieAction) {
  REST.push(
    e(slug, 'movie', 'movie-action', name, summary,
      `${name}以${genre}见长，${year} 上映后影响动作片剪辑、特技与类型公式。导演${director}在场面调度、节奏与角色张力上树立标杆。\n\n动作片融合犯罪、特工、武术或战争元素，全球票房与流媒体反复验证系列 IP 价值。`,
      '动作设计', genre, '相关', '与同类系列构成马拉松观影；配乐与剪辑节奏是分析重点',
      ['动作', '电影', genre, director], { 分类: '动作 / 犯罪电影', 年份: year, 导演: director, 类型: genre, 特技: '实拍 / 特技混合', 影响: '类型模板' }))
}

// —— illustration digital ——
const illDigital = [
  ['illustration-digital-concept-art', '数字概念艺术', '影视游戏前期场景与角色氛围设定。', 'Photoshop / Blender', '概念设计'],
  ['illustration-character-design', '角色设计', '造型、服装与性格可视化的创作流程。', '三视图', 'IP 开发'],
  ['illustration-anime-portrait', '动漫肖像', '赛璐璐或厚涂风格的角色头像插画。', 'Procreate / CSP', '二次元'],
  ['illustration-game-art', '游戏美术', '原画、立绘与 UI 风格统一的视觉体系。', 'Unity / Unreal', '游戏'],
  ['ill-pixiv-trending', 'Pixiv 趋势插画', '日系同人平台流行风格与标签文化。', 'Pixiv', '同人'],
  ['ill-cyberpunk-city', '赛博朋克城市', '霓虹雨夜、高楼与全息广告的未来都市。', '霓虹', '科幻'],
  ['ill-game-ui-splash', '游戏启动图', '登录界面与版本 KV 商业插画。', '手游', '商业'],
  ['ill-vtuber-model', 'Vtuber 立绘', 'Live2D 分层与虚拟主播形象设计。', 'Live2D', '虚拟'],
  ['ill-light-novel-cover', '轻小说封面', '文库本封面构图与角色卖点表现。', '文库', '出版'],
  ['ill-blender-3d', 'Blender 3D 插画', '三渲二或写实渲染的数字艺术。', 'Blender', '3D'],
  ['ill-procreate-sketch', 'Procreate 速写', 'iPad 手绘草稿与色块探索。', 'Procreate', '速写'],
]
for (const [slug, name, summary, tool, genre] of illDigital) {
  REST.push(
    e(slug, 'illustration', 'ill-digital', name, summary,
      `${name}依托${tool}等数字工具完成创作，属于${genre}领域视觉产出。数字绘画可无损修改图层、色彩与构图，广泛用于娱乐产业流水线。\n\n艺术家常通过社交媒体发布过程视频，形成教程与约稿经济生态。`,
      '创作要点', `${tool}，构图与光影，行业规范交付`, '相关', '与概念艺术、动画制作、游戏原画岗位技能树重叠',
      ['数字绘画', genre, tool, '插画'], { 分类: '数字插画', 工具: tool, 领域: genre, 输出: '商业 / 同人', 平台: 'Pixiv / ArtStation', 技能: '构图、色彩、人体' }))
}

// —— illustration classic ——
const illClassic = [
  ['illustration-starry-night', '星夜 The Starry Night', '梵高 1889 年圣雷米夜空旋涡笔触。', '梵高', '后印象派', '1889'],
  ['illustration-the-scream', '呐喊 The Scream', '蒙克 1893 年存在焦虑标志性形象。', '蒙克', '表现主义', '1893'],
  ['illustration-monet-water-lilies', '睡莲 Water Lilies', '莫奈吉维尼花园光影与印象派色彩。', '莫奈', '印象派', '1910s'],
  ['illustration-picasso-guernica', '格尔尼卡 Guernica', '毕加索 1937 年反战黑白巨作。', '毕加索', '立体主义', '1937'],
  ['illustration-klimt-kiss', '吻 The Kiss', '克里姆特金箔装饰与新艺术风格。', '克里姆特', '新艺术', '1908'],
  ['illustration-hokusai-wave', '神奈川冲浪里', '葛饰北斋浮世绘巨浪与富士山。', '北斋', '浮世绘', '1831'],
  ['ill-rembrandt-night-watch', '夜巡 The Night Watch', '伦勃朗光影与荷兰黄金时代群像。', '伦勃朗', '巴洛克', '1642'],
  ['ill-da-vinci-mona-lisa', '蒙娜丽莎 Mona Lisa', '达芬奇晕涂法微笑与文艺复兴人文。', '达芬奇', '文艺复兴', '1503'],
  ['ill-botticelli-birth-venus', '维纳斯的诞生', '波提切利贝壳与古典神话唯美。', '波提切利', '文艺复兴', '1485'],
  ['ill-munch-scream', '呐喊（版画版）', '蒙克多重媒介呐喊形象传播。', '蒙克', '表现主义', '1895'],
  ['ill-renoir-dance', '煎饼磨坊的舞会', '雷诺阿印象派光影中舞会欢乐。', '雷诺阿', '印象派', '1876'],
  ['ill-caravaggio', '卡拉瓦乔光影', '明暗对照法戏剧性宗教与世俗题材。', '卡拉瓦乔', '巴洛克', '1600s'],
]
for (const [slug, name, summary, artist, movement, year] of illClassic) {
  REST.push(
    e(slug, 'illustration', 'ill-classic', name, summary,
      `${name}由${artist}创作，属${movement}重要作品，约${year}年。作品在艺术史教材、博物馆常设展与流行文化引用中反复出现。\n\n古典绘画技法、颜料介质与历史语境构成鉴赏基础，数字复制品亦广泛用于艺术教育。`,
      '艺术史', `${movement}，${artist}，${year}`, '相关', '与同期流派画家并列研究；博物馆巡展常借展',
      ['艺术史', movement, artist, '名画'], { 分类: '古典绘画', 艺术家: artist, 流派: movement, 年代: year, 媒介: '油画 / 版画等', 收藏: '全球主要博物馆' }))
}

// —— ui mobile ——
const uiMobile = [
  ['ui-figma-design', 'Figma 设计', '协作式界面设计工具，组件与变体驱动设计系统。', 'Figma', '协作'],
  ['ui-dark-mode', '深色模式', 'OLED 省电与夜间可读性，对比度与 elevation 规范。', 'iOS / Android', '主题'],
  ['ui-accessibility', '无障碍设计', 'WCAG 对比度、屏幕阅读器与包容性交互。', 'WCAG', '包容'],
  ['ui-micro-interaction', '微交互', '按钮反馈、加载与手势动画提升感知品质。', 'Motion', '动效'],
  ['ui-design-system', '设计系统', 'Token、组件库与文档站点统一产品视觉。', 'Storybook', '系统'],
  ['ui-fluent-ios', 'Fluent / iOS 风格', '微软 Fluent 与苹果 HIG 平台规范对比。', '平台规范', '原生'],
  ['ui-samsung-one-ui', '三星 One UI', '大屏单手友好与折叠屏适配。', 'One UI', '安卓'],
  ['ui-material-you-widget', 'Material You 小组件', 'Android 12+ 动态取色与 widget 生态。', 'Material 3', '安卓'],
  ['ui-watchos', 'watchOS 界面', '圆形屏幕信息密度与并发症布局。', 'watchOS', '可穿戴'],
  ['ui-android-14', 'Android 14 界面', '预测返回手势与隐私仪表盘等新特性。', 'Android 14', '系统'],
]
for (const [slug, name, summary, stack, focus] of uiMobile) {
  REST.push(
    e(slug, 'ui-design', 'ui-mobile', name, summary,
      `${name}聚焦移动端${focus}实践，基于${stack}等规范或工具构建一致体验。移动 UI 需考虑触控目标尺寸、单手区域与安全区（刘海、圆角）。\n\n设计与开发通过 Figma Dev Mode、SwiftUI / Compose 交付协作。`,
      '设计要点', `${stack}，栅格 4/8pt，可达性`, '相关', '与响应式 Web、可穿戴界面共享设计系统 Token',
      ['移动端', 'UI', stack, focus], { 分类: '移动 UI', 平台: stack, 重点: focus, 工具: 'Figma 等', 规范: 'HIG / Material', 趋势: '动态色与折叠屏' }))
}

// —— ui web ——
const uiWeb = [
  ['ui-shadcn', 'shadcn/ui', '基于 Radix 与 Tailwind 的可复制组件代码模式。', 'React', '组件'],
  ['ui-glassmorphism', '玻璃拟态', '背景模糊与半透明层叠的现代网页视觉。', 'CSS', '风格'],
  ['ui-tailwind-css', 'Tailwind CSS', '原子化 utility-first CSS 框架，快速迭代界面。', 'Tailwind', '框架'],
  ['ui-bootstrap', 'Bootstrap', '经典栅格与组件库，适合原型与后台。', 'Bootstrap', '框架'],
  ['ui-ant-design', 'Ant Design', '蚂蚁金服企业级 React 组件与设计语言。', 'React', '企业'],
  ['ui-figma-to-code', 'Figma 转代码', '设计稿到 React/Vue 的自动化与手工还原流程。', 'DevMode', '交付'],
  ['ui-chakra-ui', 'Chakra UI', '可访问性友好的 React 组件库，主题灵活。', 'React', '组件'],
  ['ui-radix-ui', 'Radix UI', '无样式可访问性 primitives，支撑 shadcn 等。', 'React', '基础'],
  ['ui-storybook', 'Storybook', '组件隔离开发与视觉回归文档。', 'Storybook', '文档'],
  ['ui-responsive-grid', '响应式栅格', '断点、流式布局与容器查询现代 CSS。', 'CSS Grid', '布局'],
  ['ui-notion-style', 'Notion 风格', '块编辑器、留白与中性色生产力界面。', 'SaaS', '生产力'],
  ['ui-stripe-dashboard', 'Stripe Dashboard', '金融科技数据可视化与清晰层级范例。', 'Stripe', 'B2B'],
  ['ui-vercel-design', 'Vercel 设计', '黑白极简、渐变与开发者产品着陆页美学。', 'Vercel', '开发者'],
]
for (const [slug, name, summary, stack, focus] of uiWeb) {
  REST.push(
    e(slug, 'ui-design', 'ui-web', name, summary,
      `${name}代表 Web 端${focus}方向，常用技术栈包括${stack}。现代网页强调性能（Core Web Vitals）、可访问性与设计系统一致性。\n\n从着陆页到复杂 Dashboard，需平衡信息密度与视觉层级。`,
      '实现要点', `${stack}，语义 HTML，响应式`, '相关', '与 Tailwind、组件库、设计 Token 工作流紧密相关',
      ['Web', 'UI', stack, focus], { 分类: 'Web UI', 技术: stack, 重点: focus, 交付: '设计 + 前端', 趋势: 'Server Components', 工具: 'Figma / Storybook' }))
}

// —— interior nordic ——
const intNordic = [
  ['interior-minimalist-white', '极简白调客厅', '大白墙、浅木色与少量线条家具，北欧极简基调。', '白色', '客厅'],
  ['interior-industrial-loft', '工业风 Loft', '裸露砖墙、钢梁与复古皮革沙发。', '工业', 'Loft'],
  ['interior-mid-century', '中世纪现代', '柚木、锥脚椅与复古几何纺织品。', 'MCM', '复古'],
  ['interior-coastal', '海岸风', '蓝白条纹、麻绳与浅色木地板海滨度假感。', '海岸', '度假'],
  ['interior-hygge-bedroom', 'Hygge 卧室', '蜡烛、针织毯与柔和灯光营造丹麦式舒适。', 'hygge', '卧室'],
  ['interior-ikea-showroom', 'IKEA 展厅风', '模块化储物、平价设计民主化样板空间。', 'IKEA', '展厅'],
  ['interior-scandi-kitchen', '北欧厨房', '白色橱柜、木质台面与功能收纳。', '厨房', '收纳'],
  ['interior-danish-hygge', '丹麦 Hygge 角落', '壁炉旁阅读角与天然材质。', '丹麦', '角落'],
  ['interior-swedish-cabin', '瑞典木屋', '红色漆木外观与室内浅色松木。', '瑞典', '木屋'],
  ['interior-norwegian-fjord-house', '挪威峡湾屋', '大窗框景与极简应对长冬光线。', '挪威', '景观'],
  ['interior-finnish-sauna-room', '芬兰桑拿房', '桦木长椅与石材墙面，蒸汽文化核心。', '芬兰', '桑拿'],
]
for (const [slug, name, summary, style, room] of intNordic) {
  REST.push(
    e(slug, 'interior', 'int-nordic', name, summary,
      `${name}体现北欧${style}设计语言：功能优先、自然光最大化与${room}场景的人体工学。浅色系放大空间感，木材平衡冷调气候。\n\n可持续材料、节能窗与简化线脚是常见做法，IKEA 与 Hay 等品牌推动全球普及。`,
      '搭配要点', `${style}色调，天然材质，简洁家具`, '相关', '与日式侘寂、现代极简有交叉借鉴',
      ['北欧', '家装', style, room], { 分类: '北欧风格', 风格: style, 空间: room, 材质: '木、棉麻、羊毛', 光线: '重视自然光', 品牌: 'IKEA / Hay 等' }))
}

// —— interior zen ——
const intZen = [
  ['interior-wabi-sabi', '侘寂 Wabi-Sabi', '不完美、无常与朴素美的日式美学空间。', '侘寂', '茶室'],
  ['interior-tea-room', '茶室', '榻榻米、蹲踞入口与一期一会茶道空间。', '茶道', '和室'],
  ['interior-shoji-screen', '障子推拉门', '木格纸屏分隔柔光，调节通风与隐私。', '障子', '隔断'],
  ['interior-ryokan', '日式旅馆', '温泉、怀石与客房布草的传统款待体验。', '旅馆', '温泉'],
  ['interior-karesansui', '枯山水', '白沙耙纹象征水流，石组为山岛的禅庭。', '枯山水', '庭院'],
  ['interior-minka', '民家', '茅草屋顶与粗大梁的传统农家建筑室内。', '民家', '乡土'],
  ['interior-tatami-bedroom', '榻榻米卧室', '叠席、矮柜与纸灯营造安静睡眠环境。', '榻榻米', '卧室'],
  ['interior-tokonoma', '床之间', '挂轴、插花与陈设的待客焦点壁龛。', '床之间', '陈列'],
  ['interior-engawa', '缘侧', '室内外过渡廊道，坐观庭景。', '缘侧', '廊道'],
  ['interior-onsen-ryokan', '温泉旅馆', '露天风吕、木浴桶与浴衣体验。', '温泉', '旅馆'],
  ['interior-zen-balcony', '禅意阳台', '盆栽、竹篱与石灯的小型都市冥想角。', '都市', '阳台'],
]
for (const [slug, name, summary, style, room] of intZen) {
  REST.push(
    e(slug, 'interior', 'int-zen', name, summary,
      `${name}源于日本${style}传统，强调人与自然的${room}关系。材料多用竹、木、石与和纸，色调偏大地色系，减少视觉噪音以利冥想。\n\n现代都市住宅常将禅意元素局部化，如枯山水阳台或榻榻米角落。`,
      '营造要点', `${style}，自然材质，留白与秩序`, '相关', '与北欧极简、中式园林可对话融合',
      ['日式', '禅意', style, room], { 分类: '日式禅意', 元素: style, 空间: room, 材质: '木、竹、石、纸', 原则: '留白、自然', 场景: '茶、宿、庭' }))
}

// —— industrial product ——
const idProduct = [
  ['industrial-iphone-design', 'iPhone 设计', '苹果全面屏与钛金属边框迭代，生态系统核心硬件。', 'Apple', '智能手机', '2007–'],
  ['industrial-braun-dieter-rams', '博朗 × 迪特·拉姆斯', '「少，但更好」 ten principles 影响现代设计。', 'Braun', '家电', '1950s–'],
  ['industrial-playstation5', 'PlayStation 5', '白色流线主机与 DualSense 触觉反馈。', 'Sony', '游戏主机', '2020'],
  ['industrial-kindle', 'Kindle 电子书', '电子墨水阅读器，护眼与长续航。', 'Amazon', '阅读器', '2007'],
  ['industrial-muji-product', '无印良品', '无品牌优质素材哲学，收纳与生活杂货。', 'MUJI', '生活', '1980'],
  ['industrial-sony-walkman', '索尼 Walkman', '便携式音乐革命，私人聆听文化起点。', 'Sony', '音频', '1979'],
  ['industrial-nintendo-switch', '任天堂 Switch', '掌机主机二合一，Joy-Con 社交游戏。', 'Nintendo', '游戏', '2017'],
  ['industrial-tesla-model-s', '特斯拉 Model S', '纯电性能轿车，大屏中控与 OTA 更新。', 'Tesla', '电动车', '2012'],
  ['industrial-bang-olufsen', 'B&O 音响', '丹麦雕塑感音响与铝材加工美学。', 'Bang & Olufsen', '音频', '1925'],
  ['industrial-leica-m', '徕卡 M 相机', '旁轴胶片传奇，红色圆标与德制光学。', 'Leica', '相机', '1954'],
  ['industrial-roomba', 'iRobot Roomba', '家用扫地机器人普及者，传感器导航。', 'iRobot', '机器人', '2002'],
]
for (const [slug, name, summary, brand, cat, year] of idProduct) {
  REST.push(
    e(slug, 'industrial-design', 'id-product', name, summary,
      `${name}由${brand}推出，属${cat}领域工业设计典范，${year} 年间影响用户习惯与行业标准。造型、人机工程与材料工艺共同定义产品识别度。\n\n设计史课程常将其与 Dieter Rams、Jony Ive 等人物及方法论关联讨论。`,
      '设计原则', '功能、可用性、美学与成本平衡', '相关', '与包豪斯、现代主义、极简主义设计运动一脉相承',
      ['工业设计', brand, cat, '经典'], { 分类: '产品设计', 品牌: brand, 类型: cat, 时期: year, 领域: '消费科技', 影响: '行业标杆' }))
}

// —— industrial home ——
const idHome = [
  ['industrial-eames-chair', '伊姆斯躺椅', 'Charles & Ray Eames 1956 年皮革模压胶合板经典。', 'Herman Miller', '家具', '1956'],
  ['industrial-vitra-chair', 'Vitra 家具', '欧洲现代设计品牌，代理伊姆斯等大师作品。', 'Vitra', '家具', '1950'],
  ['industrial-nespresso', 'Nespresso 咖啡机', '胶囊系统与 George Clooney 广告塑造轻奢咖啡仪式。', 'Nestlé', '厨电', '1986'],
  ['industrial-herman-miller', 'Herman Miller Aeron', '人体工学办公椅，网格悬挂支撑。', 'Herman Miller', '办公', '1994'],
  ['industrial-le-creuset', 'Le Creuset 珐琅锅', '法式铸铁彩色珐琅锅，厨房色彩点缀。', 'Le Creuset', '厨具', '1925'],
  ['industrial-philips-hue', 'Philips Hue', '智能灯泡与场景自动化家居照明。', 'Philips', '智能家居', '2012'],
  ['industrial-smeg-fridge', 'Smeg 冰箱', '50 年代复古造型与大胆配色。', 'Smeg', '厨电', '1997'],
  ['industrial-kitchenaid', 'KitchenAid 厨师机', '美式站立式搅拌器，多色烤漆。', 'KitchenAid', '厨具', '1919'],
  ['industrial-aeropress', 'AeroPress 爱乐压', 'Alan Adler 发明便携压力咖啡器具。', 'AeroPress', '咖啡', '2005'],
  ['industrial-ikea-billy', 'IKEA Billy 书柜', '全球最畅销书柜之一，平价模块化。', 'IKEA', '家具', '1979'],
  ['industrial-muuto-beam-lamp', 'Muuto Beam 灯具', '北欧极简金属灯臂，丹麦品牌。', 'Muuto', '灯具', '2010s'],
]
for (const [slug, name, summary, brand, cat, year] of idHome) {
  REST.push(
    e(slug, 'industrial-design', 'id-home', name, summary,
      `${name}为${brand}${cat}代表产品，${year} 起进入家庭场景。家居工业设计关注日常使用频率、清洁便利与空间融合。\n\n经典单品常成为租屋与样板间标配，二手市场保值反映设计持久魅力。`,
      '使用场景', `${cat}，耐用性，清洁与收纳`, '相关', '与北欧家装、厨房开放动线趋势协同',
      ['家居', brand, cat, '设计'], { 分类: '家居产品设计', 品牌: brand, 类型: cat, 时期: year, 场景: '家庭', 特点: '功能与美学' }))
}

// —— history china ——
const histChina = [
  ['history-forbidden-city', '故宫紫禁城', '明清两代皇宫，北京中轴线世界文化遗产。', '北京', '明清', '1987 世界遗产'],
  ['history-potala-palace', '布达拉宫', '拉萨红山宫堡，藏传佛教圣地。', '西藏', '吐蕃至清', '1994 世界遗产'],
  ['history-summer-palace', '颐和园', '昆明湖与万寿山皇家园林。', '北京', '清代', '世界遗产'],
  ['history-mogao-caves', '莫高窟', '敦煌千佛洞壁画与丝路艺术宝库。', '甘肃', '十六国至元', '世界遗产'],
  ['history-pingyao', '平遥古城', '保存完整的明清县城格局与票号金融史。', '山西', '明清', '世界遗产'],
  ['history-lijiang', '丽江古城', '纳西族东巴文化与三方街水系。', '云南', '宋至清', '世界遗产'],
  ['history-temple-of-heaven', '天坛', '皇帝祭天祈谷的圆形建筑群。', '北京', '明清', '世界遗产'],
  ['history-potala', '布达拉宫（历史词条）', '藏汉建筑融合，达赖冬宫与宗教中心。', '拉萨', '7 世纪起', '世界遗产'],
  ['history-suzhou-garden', '苏州古典园林', '拙政园等私家园林叠山理水。', '江苏', '明至清', '世界遗产'],
  ['history-dazu-rock-carvings', '大足石刻', '唐宋摩崖造像，佛教艺术巅峰之一。', '重庆', '唐至宋', '世界遗产'],
]
for (const [slug, name, summary, loc, era, status] of histChina) {
  REST.push(
    e(slug, 'history', 'hist-china', name, summary,
      `${name}位于${loc}，主要建造或使用于${era}，${status}。体现中国古代礼制、宗教、城市规划或商贸文明成就。\n\n考古、文献与建筑形制研究是理解其价值的主要路径，旅游需尊重文物保护规定。`,
      '参观要点', '预约门票，禁止触摸文物，淡季错峰', '相关', '与长城、兵马俑并列为中国标志性遗产',
      ['中国', '世界遗产', loc, era], { 分类: '中国史迹', 地点: loc, 时代: era, 地位: status, 类型: '建筑 / 石窟 / 古城', 保护: '国家级文保' }))
}

// —— history world ——
const histWorld = [
  ['history-machu-picchu', '马丘比丘', '印加高原空中古城，安第斯云雾中的石砌奇迹。', '秘鲁', '15 世纪', '世界遗产'],
  ['history-petra', '佩特拉古城', '约旦玫瑰红岩石凿刻宝库与纳巴泰文明。', '约旦', '公元前', '世界遗产'],
  ['history-colosseum', '罗马斗兽场', '弗拉维王朝圆形竞技场，古罗马工程象征。', '意大利', '公元 72–80', '世界遗产'],
  ['history-stonehenge', '巨石阵', '英国威尔特郡史前石圈，天文与仪式之谜。', '英国', '史前', '世界遗产'],
  ['history-acropolis', '雅典卫城', '帕特农神庙与古希腊民主文明象征。', '希腊', '公元前 5 世纪', '世界遗产'],
  ['history-taj-mahal', '泰姬陵', '莫卧儿白色大理石陵墓，爱情与对称美学。', '印度', '17 世纪', '世界遗产'],
  ['history-chichen-itza', '奇琴伊察', '玛雅羽蛇神庙与天文历法遗址。', '墨西哥', '公元 600–1200', '世界遗产'],
  ['history-easter-island', '复活节岛摩艾', '智利离岸巨石人像，拉帕努伊文化。', '智利', '公元 1250–1500', '世界遗产'],
  ['history-pyramids-giza', '吉萨金字塔', '胡夫金字塔与狮身人面像，古埃及王权。', '埃及', '公元前 26 世纪', '世界遗产'],
  ['history-parthenon', '帕特农神庙', '卫城核心神庙，多立克柱式典范。', '希腊', '公元前 447', '世界遗产'],
  ['history-angkor-thom', '吴哥通王城', '柬埔寨高棉帝国巴戎寺微笑佛像。', '柬埔寨', '12 世纪', '世界遗产'],
]
for (const [slug, name, summary, loc, era, status] of histWorld) {
  REST.push(
    e(slug, 'history', 'hist-world', name, summary,
      `${name}坐落于${loc}，兴盛于${era}，为${status}。见证古代文明的政治、宗教、建筑或天文成就，是环球旅行与考古学热点。\n\n气候变化、游客压力与战争曾威胁遗产安全，国际社会通过 UNESCO 框架推动保护。`,
      '旅行提示', '尊重当地文化，遵守摄影与攀爬禁令', '相关', '与庞贝、吴哥窟、金字塔等同属必访史迹',
      ['世界遗产', loc, era, '古代'], { 分类: '世界史迹', 地点: loc, 时代: era, 地位: status, 文明: '多元古代文明', 保护: 'UNESCO' }))
}

console.log('Total entries:', REST.length)

const header = `/**
 * 世界主题库 catalog 扩展行（由 _gen-world-catalog.mjs 合并，不含 hero-marvel）
 * 每行: [slug, categoryId, subCategoryId, name, summary, description, tags, specs]
 */
function d(p1, l2, p2, l3, p3) {
  return \`\${p1}\\n\\n\${l2}：\${p2}\\n\\n\${l3}：\${p3}\`
}

export const REST_NEW = [
`

const body = REST.map(fmtEntry).join(',\n')
const footer = '\n]\n'

writeFileSync(join(dir, '_gen-world-catalog-data.mjs'), header + body + footer)
console.log('Wrote', REST.length, 'entries to _gen-world-catalog-data.mjs')
