/**
 * 全库 catalog 扩展条目（由 build-library-catalog.mjs 合并）
 * 对照需求说明：电影、立绘、UI、家装、工业设计等大类
 */
export function extraCatalogItems(item) {
  return [
    // —— 电影 ——
    item(
      'movie-inception',
      'movie',
      'movie-scifi',
      '盗梦空间 Inception',
      '2010 年克里斯托弗·诺兰科幻悬疑片，多层梦境植入与折叠城市视觉经典。',
      '《盗梦空间》（Inception）由 Christopher Nolan 编剧执导，Leonardo DiCaprio 饰演造梦师柯布。影片构建「梦中梦」多层意识结构，团队需在目标脑中植入想法而不被察觉。\n\n视觉：巴黎街道折叠、无重力酒店走廊等场景成为影史标志。汉斯·季默配乐以《Non, je ne regrette rien》节奏驱动梦境倒计时。获奥斯卡最佳摄影、最佳音效等。\n\n相关：与《记忆碎片》《星际穿越》同属诺兰时间/认知主题作品；「陀螺是否停转」为经典开放式结局讨论。',
      ['诺兰', '科幻', '梦境', '2010'],
      {
        分类: '科幻悬疑',
        导演: 'Christopher Nolan',
        上映: '2010',
        主演: 'Leonardo DiCaprio',
        摄影: 'Wally Pfister',
        配乐: 'Hans Zimmer',
        奖项: '奥斯卡 4 项'
      }
    ),
    item(
      'movie-spirited-away',
      'movie',
      'movie-fantasy',
      '千与千寻 千と千尋の神隠し',
      '宫崎骏 2001 年吉卜力动画，少女千寻在神灵浴场成长的奇幻寓言。',
      '《千与千寻》由宫崎骏执导、吉卜力工作室制作，2001 年日本上映，获第 75 届奥斯卡最佳动画长片。少女荻野千寻随父母误入神灵世界，父母因贪吃变猪，千寻在汤婆婆的汤屋工作以寻回父母并回到人间。\n\n角色：白龙、无脸男、锅炉爷爷、钱婆婆等成为经典形象。主题涉及消费主义、环境、成长与记忆。配乐由久石让担任，《Always with Me》广为流传。\n\n相关：与《龙猫》《哈尔的移动城堡》同为吉卜力代表作；影响全球动画与主题乐园设计。',
      ['吉卜力', '宫崎骏', '动画', '奥斯卡'],
      {
        分类: '奇幻动画',
        导演: '宫崎骏',
        上映: '2001',
        制作: '吉卜力工作室',
        配乐: '久石让',
        荣誉: '奥斯卡最佳动画长片',
        主题: '成长、环保、记忆'
      }
    ),
    item(
      'movie-the-dark-knight',
      'movie',
      'movie-action',
      '蝙蝠侠：黑暗骑士',
      '2008 年诺兰《黑暗骑士》三部曲第二部，希斯·莱杰饰小丑成影史反派标杆。',
      '《蝙蝠侠：黑暗骑士》（The Dark Knight）为 Christopher Nolan 蝙蝠侠三部曲中篇，Christian Bale 饰布鲁斯·韦恩，Heath Ledger 饰小丑（Joker）。故事围绕哥谭黑帮与小丑制造的混乱展开，探讨秩序、恐怖与英雄代价。\n\n拍摄大量使用 IMAX 胶片；芝加哥实景替代哥谭。Ledger 去世后获奥斯卡最佳男配角（遗作）。票房与口碑双丰收，常被列为影史最佳超级英雄电影。\n\n相关：前作《侠影之谜》、续作《黑暗骑士崛起》；与小丑角色在漫画史多次重启相关。',
      ['蝙蝠侠', '诺兰', 'DC', '小丑'],
      {
        分类: '动作犯罪',
        导演: 'Christopher Nolan',
        上映: '2008',
        主演: 'Christian Bale / Heath Ledger',
        宇宙: 'DC（独立三部曲）',
        摄影: 'IMAX 实拍',
        特点: '现实主义犯罪叙事'
      }
    ),

    // —— 立绘 ——
    item(
      'illustration-vocaloid-miku',
      'illustration',
      'ill-digital',
      '初音未来 Hatsune Miku',
      'Crypton 发行的 Vocaloid 2 虚拟歌手角色，双马尾青色形象席卷同人创作与演唱会文化。',
      '初音未来（初音ミク）使用 Yamaha Vocaloid 2 语音合成引擎，声库取样自声优藤田咲。2007 年由 Crypton Future Media 以「角色驱动」方式发行，催生 NicoNico 动画、MikuMikuDance（MMD）等创作生态。\n\n形象由 KEI 设计，标志性双马尾与领带元素。Magical Mirai、MIKU EXPO 等演唱会使用全息/大屏技术。版权采用「Piapro 角色使用指南」，鼓励非商业与限定商业二次创作。\n\n相关：镜音铃·连、巡音流歌等同属 Crypton 角色；是虚拟偶像与 UGC 文化的里程碑。',
      ['Vocaloid', '虚拟歌手', '同人', 'Crypton'],
      {
        分类: '数字插画',
        引擎: 'Vocaloid 2',
        发行: '2007',
        开发商: 'Crypton Future Media',
        形象设计: 'KEI',
        声源: '藤田咲',
        文化: 'Piapro / MMD'
      }
    ),
    item(
      'illustration-girl-with-pearl-earring',
      'illustration',
      'ill-classic',
      '戴珍珠耳环的少女',
      '17 世纪荷兰画家维米尔代表作，少女回眸与珍珠耳饰被誉为「北方的蒙娜丽莎」。',
      '《戴珍珠耳环的少女》（Meisje met de parel）约创作于 1665 年，作者约翰内斯·维米尔（Johannes Vermeer）。现藏荷兰海牙莫瑞泰斯皇家美术馆。画面以深蓝头巾、珍珠耳饰与侧光面部为焦点，背景极简。\n\n技法：可能使用相机 obscura 辅助透视；有限颜料与细腻层次体现荷兰黄金时代室内画特色。2003 年电影《戴珍珠耳环的少女》由 Scarlett Johansson、Colin Firth 主演，带动大众认知。\n\n相关：与《倒牛奶的女仆》等同为维米尔室内题材；荷兰黄金时代绘画研究核心作品。',
      ['维米尔', '荷兰黄金时代', '油画', '肖像'],
      {
        分类: '经典绘画',
        作者: 'Johannes Vermeer',
        年代: '约 1665',
        馆藏: '莫瑞泰斯皇家美术馆（海牙）',
        媒介: '油画布本',
        别名: '北方的蒙娜丽莎',
        题材: 'tronie 头像研究'
      }
    ),

    // —— UI 设计 ——
    item(
      'ui-material-design-3',
      'ui-design',
      'ui-mobile',
      'Material Design 3',
      'Google 2021 年推出的跨平台设计系统，强调动态配色、圆角与无障碍组件。',
      'Material Design 3（M3）由 Google 在 Google I/O 2021 发布，用于 Android 12+、Flutter、Web（Material Web）等。核心概念包括：Material You 动态取色（从壁纸生成主题色）、更大圆角、强调排版层级与状态层。\n\n组件覆盖 Button、FAB、Navigation、Card、Dialog 等；提供 Figma 设计套件与开发者文档。与 Material Design 2 相比更个性化、更少「纸墨」隐喻，强化情感化表达。\n\n相关：与 Apple Human Interface Guidelines、Microsoft Fluent 并列主流移动端规范；Jetpack Compose 为官方 Android 实现路径。',
      ['Google', 'Android', '设计系统', 'Material You'],
      {
        分类: '移动端规范',
        发布方: 'Google',
        首发: '2021',
        平台: 'Android / Flutter / Web',
        特点: '动态配色、大圆角',
        组件: 'M3 Design Kit',
        前身: 'Material Design 2'
      }
    ),
    item(
      'ui-ios-human-interface',
      'ui-design',
      'ui-mobile',
      'Apple Human Interface Guidelines',
      '苹果人机界面指南，定义 iOS/iPadOS 导航、触控目标与无障碍设计原则。',
      'Human Interface Guidelines（HIG）是 Apple 为 iOS、iPadOS、macOS、watchOS、visionOS 提供的设计与交互规范。强调清晰（Clarity）、遵从（Deference）、深度（Depth）三大原则。\n\n要点：44pt 最小触控目标、Safe Area、Navigation Bar / Tab Bar 模式、Dynamic Type 字体缩放、VoiceOver 无障碍。SwiftUI 与 UIKit 组件与 HIG 对齐。每年 WWDC 会更新视觉与交互建议。\n\n相关：与 Material Design、Fluent 对比常作为平台设计教学案例；App Store 审核亦参考体验一致性。',
      ['Apple', 'iOS', 'HIG', 'SwiftUI'],
      {
        分类: '移动端规范',
        发布方: 'Apple',
        适用: 'iOS / iPadOS / macOS 等',
        原则: '清晰、遵从、深度',
        触控: '最小 44×44 pt',
        无障碍: 'VoiceOver / Dynamic Type',
        更新: 'WWDC 年度修订'
      }
    ),

    // —— 家装 ——
    item(
      'interior-scandinavian-living',
      'interior',
      'int-nordic',
      '北欧风客厅',
      '以浅木色、白色墙面与功能性家具为特征，强调自然光与「hygge」舒适感。',
      '北欧风格（Scandinavian）源于丹麦、挪威、瑞典等国的室内传统，20 世纪中期在现代主义影响下形成国际审美。典型元素：浅色橡木/白蜡木、白色或浅灰墙面、简约沙发、几何地毯、大面积窗户与绿植。\n\n色彩克制，点缀莫兰迪色或黑色金属灯具。品牌如 Hay、Muuto、IKEA 推动普及。注重可持续木材与节能照明。\n\n相关：与日式侘寂、现代极简有交集；2010 年代 Pinterest/Instagram 推动全球流行。',
      ['北欧', '客厅', '简约', 'hygge'],
      {
        分类: '北欧简约',
        起源: '斯堪的纳维亚',
        主色: '白、浅木、灰',
        材质: '橡木、羊毛、棉麻',
        照明: '自然光 + 简约吊灯',
        代表品牌: 'Hay / Muuto / IKEA',
        氛围: 'hygge 舒适'
      }
    ),
    item(
      'interior-japanese-zen',
      'interior',
      'int-zen',
      '日式禅意和室',
      '榻榻米、障子门与枯山水庭院意象，追求留白与季节感的东方居住美学。',
      '和室（わしつ）为日本传统房间，地面铺榻榻米，以障子（纸拉门）采光分隔空间。茶室、坐禅角落常结合「侘寂」（wabi-sabi）审美：接受不完美与自然老化。\n\n元素：矮桌（座卓）、蒲团、壁龛（床の間）插花、挂轴。对外连接枯山水庭院（枯山Water）延伸室内意境。现代公寓常做「和洋折衷」简化版。\n\n相关：与北欧极简同属「少即是多」；京都町家为完整传统范例。',
      ['和室', '榻榻米', '侘寂', '禅意'],
      {
        分类: '日式禅意',
        地面: '榻榻米',
        门窗: '障子拉门',
        审美: '侘寂 wabi-sabi',
        功能: '茶室 / 冥想 / 客室',
        延伸: '枯山水庭院',
        现代: '和洋折衷'
      }
    ),

    // —— 工业设计 ——
    item(
      'industrial-alessi-kettle',
      'industrial-design',
      'id-home',
      '阿莱西 9093 鸟鸣水壶',
      '理查德·萨帕 1980 年代经典设计，壶嘴蒸汽驱动鸟哨鸣叫。',
      '9093 水壶由意大利 Alessi 生产，设计师 Richard Sapper（1983）。不锈钢壶身，壶嘴集成塑料鸟形哨，水沸时蒸汽通过鸟哨发出鸟鸣，兼具趣味与功能反馈。\n\n被誉为后现代设计象征之一，纽约现代艺术博物馆（MoMA）收藏。体现意大利「设计工厂」将日常器物艺术化的传统。\n\n相关：与 Philippe Starck 为 Alessi 设计的作品并列；影响后续趣味家电设计。',
      ['Alessi', '水壶', '萨帕', '后现代'],
      {
        分类: '家居产品',
        设计师: 'Richard Sapper',
        品牌: 'Alessi（意大利）',
        年份: '1983',
        材质: '不锈钢 + 塑料哨',
        特点: '蒸汽鸟鸣',
        收藏: 'MoMA'
      }
    ),
    item(
      'industrial-dyson-v15',
      'industrial-design',
      'id-product',
      '戴森 V15 Detect',
      '戴森旗舰无线吸尘器，激光显尘、压电式颗粒计数与 Hyperdymium 马达。',
      'Dyson V15 Detect 搭载激光斜照吸头使微尘可见，声学压电传感器可计数与分类颗粒物，LCD 屏实时显示。Hyperdymium 马达提供高吸力，整机平衡设计减轻手腕负担。\n\n品牌：James Dyson 1978 年创立，以 cyclone 气旋分离技术革新吸尘器行业，总部英国马尔文。产品线含风扇、吹风机、空气净化器等，强调工程美学与专利壁垒。\n\n相关：与 Shark、小米无线吸尘器竞争高端市场；设计奖常客。',
      ['戴森', '吸尘器', '激光显尘', '家电'],
      {
        分类: '消费电子',
        品牌: 'Dyson',
        型号: 'V15 Detect',
        技术: '激光显尘 / 颗粒传感',
        马达: 'Hyperdymium',
        创立: 'James Dyson / 1991',
        总部: '英国马尔文'
      }
    ),

    // —— 扩充既有大类 ——
    item(
      'supercar-mclaren-720s',
      'supercar',
      'car-britain',
      '迈凯伦 720S',
      '英国沃金双涡轮 V8 超跑，单体碳纤维 Monocage II，极致空气动力学。',
      '迈凯伦 720S 2017 年发布，接替 650S，搭载 4.0L M840T 双涡轮 V8，约 720 马力。Monocage II 碳纤维单体壳减轻重量，主动空气动力学套件提升下压力。\n\n品牌：Bruce McLaren 1963 年创立赛车队，公路车部门 2010 年代量产 570S、720S、P1 等。总部英国沃金（Woking）。F1 车队历史悠久。\n\n相关：与法拉利 488、兰博基尼 Huracán 为同级竞品；Senna、765LT 为同系赛道取向衍生。',
      ['迈凯伦', '英国', 'V8', '碳纤维'],
      {
        分类: '英国品牌',
        厂商: 'McLaren Automotive',
        上市: '2017',
        发动机: '4.0L V8 双涡轮',
        功率: '约 720 hp',
        车身: 'Monocage II 碳纤维',
        总部: '英国沃金'
      }
    ),
    item(
      'plant-snake-plant',
      'plant',
      'plant-succulent',
      '虎尾兰 Sansevieria',
      '百合科虎尾兰属，耐旱耐阴，叶片直立剑形，新手友好空气净化绿植。',
      '虎尾兰（Sansevieria trifasciata，现多归入 Dracaena）原产西非，叶片肉质直立，常见黄边锦（Laurentii）。极耐旱、耐弱光，浇水过频易烂根。\n\nNASA 早期室内植物空气净化研究曾列入（争议后续有之）。夜间 CAM 代谢可释放氧气，有「卧室植物」营销说法。分株、叶插繁殖容易。\n\n相关：与芦荟、多肉同属入门绿植；现代园艺品种「月亮虎尾兰」等流行。',
      ['多肉', '耐旱', '室内', '空气净化'],
      {
        分类: '多肉与仙人掌',
        科属: '天门冬科 Dracaena（原 Sansevieria）',
        原产地: '西非',
        浇水: '干透浇透、冬季控水',
        光照: '散射光至明亮',
        繁殖: '分株、叶插',
        特点: '耐阴、耐旱'
      }
    ),
    item(
      'hero-wonder-woman',
      'superhero',
      'hero-dc',
      '神奇女侠 Wonder Woman',
      'DC 亚马逊公主戴安娜，真理套索与神力护腕，女性超级英雄代表之一。',
      '神奇女侠（Wonder Woman）由 William Moulton Marston 创作，1941 年《All Star Comics》#8 登场。戴安娜·普林斯（Diana Prince）为亚马逊天堂岛公主，拥有神赐力量、飞行、真理套索（Lasso of Truth）与不可摧毁护腕。\n\n创作背景与女性主义、二战时期宣传相关。盖尔·加朵在 DCEU《神奇女侠》《正义联盟》饰演。象征和平与正义。\n\n相关：与超人、蝙蝠侠并称 DC 三巨头之一；与漫威惊奇队长常并列讨论女性英雄代表。',
      ['DC', '亚马逊', '女性英雄', '盖尔加朵'],
      {
        宇宙: 'DC 漫画',
        首次登场: '1941',
        创作者: 'William Moulton Marston',
        本名: '戴安娜·普林斯 Diana Prince',
        装备: '真理套索、护腕、神剑',
        所属: '正义联盟'
      }
    ),
    item(
      'tf-megatron',
      'transformers',
      'tf-decepticon',
      '威震天 Megatron',
      '霸天虎领袖，常变形为手枪或坦克/战机（因系列而异），擎天柱宿敌。',
      '威震天（Megatron）是变形金刚霸天虎（Decepticon）创始人与领袖，G1 动画中变形为 Walther P38 手枪（因安全法规后期玩具改为坦克等）。与擎天柱从赛博坦战友反目成宿敌。\n\n性格残酷、野心勃勃，追求统治赛博坦与地球能源。经典配音 Frank Welker。真人电影中由 Hugo Weaving 等配音/出演。\n\n相关：衍生角色加拉克斯龙（Galvatron）为重生形态；与红蜘蛛的权谋 subplot 为经典剧情线。',
      ['霸天虎', 'Decepticon', '领袖', '宿敌'],
      {
        分类: '霸天虎 Decepticon',
        阵营: '霸天虎',
        变形: '手枪 / 坦克（作品不同）',
        宿敌: '擎天柱 Optimus Prime',
        版权: 'Hasbro / Takara Tomy',
        配音: 'Frank Welker（经典）',
        目标: '征服赛博坦与地球'
      }
    ),
    item(
      'anime-your-name',
      'anime',
      'anime-fantasy',
      '你的名字。 君の名は。',
      '新海诚 2016 年动画电影，时空交错与彗星灾难下的青春恋爱物语。',
      '《你的名字。》由新海诚编剧执导，Comix Wave Films 制作，2016 年日本票房现象级作品。高中生立花泷与宫水三叶在梦中互换身体，后发现三叶所在糸守町将遭彗星撞击，跨越时空拯救小镇。\n\n视觉：黄昏「かたわれ時」、彗星分裂、日本町景观细腻呈现。RADWIMPS 配乐《前前前世》《スパークル》广泛传播。获东京动画奖等。\n\n相关：与《天气之子》《铃芽之旅》同属新海诚「灾难+青春」系列；与《秒速5厘米》导演风格一脉相承。',
      ['新海诚', '恋爱', '时空', '彗星'],
      {
        分类: '奇幻冒险',
        导演: '新海诚',
        上映: '2016',
        制作: 'Comix Wave Films',
        配乐: 'RADWIMPS',
        主题: '时空、灾难、羁绊',
        票房: '日本影史动画前列'
      }
    ),
    item(
      'motorcycle-honda-cb650r',
      'motorcycle',
      'moto-japan',
      '本田 CB650R',
      '日本本田「Neo Sports Café」四缸街车，649cc 水冷，复古现代造型。',
      '本田 CB650R 属于 CB 系列四缸街车，搭载 649 cc 直列四缸，约 95 马力，定位 A2 驾照可驾（欧洲）与日常运动骑行。Neo Sports Café 设计语言：圆灯、短尾、裸露车架。\n\n品牌：本田技研工业（Honda）1948 年由本田宗一郎创立，全球最大摩托车制造商之一。CB 系列从 1960 年代 CB750 四缸传奇影响业界。\n\n相关：与雅马哈 XSR700、川崎 Z650 为同级竞品；CBR650R 为同平台仿赛外壳。',
      ['本田', '街车', '四缸', '日本'],
      {
        分类: '日本品牌',
        厂商: 'Honda',
        排量: '649 cc',
        发动机: '直列四缸水冷',
        功率: '约 95 hp',
        风格: 'Neo Sports Café',
        姊妹车型: 'CBR650R'
      }
    ),
    item(
      'history-angkor-wat',
      'history',
      'hist-world',
      '吴哥窟 Angkor Wat',
      '柬埔寨高棉帝国苏耶跋摩二世庙宇，世界最大宗教建筑群之一，印度教后转佛教。',
      '吴哥窟（Angkor Wat）位于柬埔寨暹粒省，约 12 世纪上半叶始建，原供奉毗湿奴，后随高棉国教转向佛教。建筑群占地约 162.6 公顷，中央塔尖象征须弥山，外墙浮雕讲述《罗摩衍那》《摩诃婆罗多》等。\n\n1992 年列入世界文化遗产。日出倒影为旅游标志景观。吴哥古城还含巴戎寺（吴哥微笑）、塔普伦寺（树根缠绕）等遗址。\n\n相关：与婆罗浮屠、缅甸蒲甘佛塔同为东南亚佛教建筑代表；法国殖民时期「发现」推动考古研究。',
      ['柬埔寨', '世界遗产', '高棉', '佛教'],
      {
        分类: '世界其他',
        时代: '高棉帝国约 12 世纪',
        位置: '柬埔寨暹粒',
        宗教: '印度教 → 佛教',
        世界遗产: '1992',
        规模: '约 162.6 公顷',
        象征: '须弥山中央塔'
      }
    )
  ]
}
