/**
 * 「哈特利老宅·暗夜初探」: which actions roll and what a failed roll reads (author, 2026-10-18: every action goes
 * through a choice and a roll; a failed roll leads to its own passage). See ../action_checks.mjs.
 * { [nodeId]: { [choice id or label]: { skill, fail } | { roll: false } } } — roll: false is movement.
 */
export const tutorialChecks = {
    "intro": {
        "hall_look": {
            "skill": "侦查",
            "fail": "手电的光圈在门厅里晃了一圈，只照出湿漉漉的地板和墙上剥落的墙纸。雨声从身后的门缝灌进来，搅得你心神不宁，目光几次从同一处滑过，什么也没留住。\n\n你站在门厅中央，鞋底下的木板轻轻呻吟，霉味越来越浓。"
        },
        "portrait": {
            "skill": "侦查",
            "fail": "你凑近那幅高大的肖像，闪电偏偏在这时歇了，画面沉进一片暗褐。手电光打在金框上，反出刺眼的白斑，油彩的纹路糊成一团，人脸只剩模糊的轮廓。\n\n你眯眼看了许久，颈后发酸，画中人依旧沉默地端坐在暗处。"
        },
        "intro_rain_door": {
            "skill": "聆听",
            "fail": "你侧耳去辨雨点敲门的节拍，可风忽然转向，雨声一阵密一阵疏，夹着远处海浪的闷响，乱成一锅。耳朵里只剩嗡嗡的潮气。\n\n你在门槛边站了片刻，镜片蒙上一层雾，身后的门扇轻轻晃着，什么规律也没听出来。"
        },
        "parlor_enter": {
            "roll": false
        },
        "kitchen": {
            "roll": false
        }
    },
    "intro_rain_door": {
        "back_intro": {
            "roll": false
        },
        "hall_look": {
            "skill": "侦查",
            "fail": "你弯腰顺着地上的泥痕往前看，可手电忽明忽暗，光线一抖，那些印子便和地板的木纹、水渍搅在一处，分不清哪道是脚印，哪道只是潮痕。\n\n你蹲得膝盖发麻，起身时眼前一阵发黑，门厅还是那副湿冷模样。"
        }
    },
    "hall_look": {
        "hall_coat_rack": {
            "skill": "侦查",
            "fail": "你弯腰去拾地上的碎屑，指尖一滑，那东西滚进地板缝里没了踪影。转身去扶衣帽架，架子沉得出奇，你只摸到一手湿冷的木头和蛛丝。\n\n楼上的滴答声没有停。你揉着发僵的手指，站在倒伏的衣帽架旁，心里空落落的。"
        },
        "hall_floorboards": {
            "skill": "侦查",
            "fail": "你伏下身，用指节一块块敲过地板。潮气让每块板都发出同样闷钝的声响，听不出哪块松动。指甲抠进板缝，只抠出一撮黑泥和几根霉丝。\n\n膝头已经湿透，你直起腰，地板依旧严丝合缝，像从未被人动过。"
        },
        "parlor_enter": {
            "skill": "追踪",
            "fail": "泥印在拱门前忽然变淡，被一片积水泡开，边缘晕成灰褐色的污斑。你来回比对了几次，再也找不到下一枚脚印的去向。\n\n你只好凭着那股咸腥味穿过拱门，脚踝立刻被客厅的湿冷裹住。"
        },
        "back_intro": {
            "skill": "侦查",
            "fail": "你退到门口，望向门外的雨幕。雨下得太密，路灯那团昏黄被冲得只剩一点光晕，碎石路、篱笆、远处的海岸线全都隐没在灰白里。\n\n冷雨斜扑进来，打湿了袖口。你看了很久，外面只有雨。"
        }
    },
    "hall_coat_rack": {
        "hall_portrait_night": {
            "skill": "侦查",
            "fail": "你转向衣帽架旁那幅画，一阵风恰从门缝钻进来，吹得手电光一晃，画框的阴影在墙上乱摇。你越想看清，眼睛越酸涩，油彩在暗处只是一块沉闷的深色。\n\n雷声迟迟不来，你只能在画前干站着，听雨。"
        },
        "parlor_enter": {
            "roll": false
        },
        "back_hall_look": {
            "skill": "侦查",
            "fail": "你回到门厅中央，举着手电慢慢转了一圈。光扫过墙角、壁炉、拱门，可一切都像蒙了层湿纱，看什么都差不多：发黑的木头，发潮的灰。\n\n你隐约觉得漏掉了什么，却说不上是什么，只闻到越来越重的鱼腥。"
        }
    },
    "hall_floorboards": {
        "kitchen": {
            "skill": "追踪",
            "fail": "你想顺着地板下渗出的那股冷气走，可它在走廊里四处乱窜，一会儿贴着脚踝，一会儿又从墙根溜走。你转了两个弯，彻底失了方向。\n\n最后是一股浓重的腥咸把你引到一扇半掩的门前，门后传来雨打铁器的声响。"
        },
        "parlor_enter": {
            "roll": false
        },
        "back_hall_look": {
            "roll": false
        }
    },
    "hall_portrait_night": {
        "portrait_detail2": {
            "skill": "侦查",
            "fail": "你再度凑近肖像，想看清油彩下的细处，手心的汗却让放大镜一滑，镜片磕在金框上，发出一声脆响。楼上的动静随之顿住。\n\n你屏息等了很久，等滴答声重新响起，眼睛早已发花，画面上只剩一片斑驳的裂纹。"
        },
        "parlor_enter": {
            "roll": false
        },
        "back_intro": {
            "roll": false
        }
    },
    "portrait": {
        "portrait_detail2": {
            "skill": "侦查",
            "fail": "你想把刚才看到的字抄下来，铅笔却在受潮的本子上划破了纸，字句断成几截。再去看画面时，雨水顺着窗缝渗进来，在画框下积出一摊，光一照满是晃动的亮斑。\n\n你看得眼眶发胀，细处依旧辨不分明。"
        },
        "parlor_enter": {
            "roll": false
        },
        "back_intro": {
            "roll": false
        }
    },
    "portrait_detail2": {
        "parlor_enter": {
            "roll": false
        },
        "study": {
            "skill": "图书馆使用",
            "fail": "书房里的纸张潮得发软，粘成厚厚一沓。你一页页去揭，纸却在指间碎成湿絮，字迹晕作一片蓝黑，读不出一个完整的词。\n\n你在桌前站了许久，手套染得乌黑，窗外的雨声一阵紧过一阵。"
        },
        "back_intro": {
            "roll": false
        }
    },
    "parlor_enter": {
        "read_log": {
            "skill": "图书馆使用",
            "fail": "你翻开那本泡胀的日志，纸页死死粘在一起。稍一用力，便撕下一片湿烂的纸屑，墨迹顺着水痕洇开，像一团团淤血。\n\n你试了好几页，读到的只有零碎的笔画。日志仍在茶几上滴水，滴在地板上，一声，又一声。"
        },
        "parlor_curtain": {
            "skill": "侦查",
            "fail": "你扯住窗帘一角，布料吸饱了雨水，重得像一面湿帆，一拉便哗地泼下一片冷水，正浇在你的鞋面上。你手忙脚乱地退开，帘子又沉沉贴回窗框。\n\n除了满手咸涩的湿意，你什么也没看出来。"
        },
        "parlor_teatable": {
            "skill": "侦查",
            "fail": "你绕着茶几慢慢走，手电光在起泡的漆面上来回打滑，反光刺得人睁不开眼。桌面、桌腿、桌下的地毯，看上去都只是一件被潮气泡坏的旧家具。\n\n你蹲下又站起，膝盖咯吱作响，茶几沉默如故。"
        },
        "intro": {
            "roll": false
        }
    },
    "parlor_curtain": {
        "read_log": {
            "skill": "图书馆使用",
            "fail": "你捧起日志，封面一软，书脊彻底散了架，十几张纸页滑落在湿地毯上。等你一张张拾起，次序早已全乱，有的正面朝下，吸足了泥水。\n\n你把它们勉强叠好，凑近手电去看，满眼只是晕开的墨团。"
        },
        "back_parlor_enter": {
            "roll": false
        }
    },
    "parlor_teatable": {
        "read_log": {
            "skill": "图书馆使用",
            "fail": "你俯身去读日志，楼上的滴答声恰在此时变了节拍，一下下敲在太阳穴上。字行在眼前游移，读过一句便忘了上一句。\n\n你合眼缓了缓，再睁开时，页面上的字迹像退潮后的沙纹，怎么也拼不成句子。"
        },
        "back_parlor_enter": {
            "roll": false
        }
    },
    "read_log": {
        "read_log_page1": {
            "skill": "图书馆使用",
            "fail": "你往前翻，想读更早的几页，竹片却卡在两张纸之间，啪地折断了。你改用指甲去挑，纸页反倒撕开一道长口，账目散成碎片。\n\n你盯着那些残缺的格子看了半天，只认出几道歪斜的格线。"
        },
        "read_log_page2": {
            "skill": "图书馆使用",
            "fail": "后半本的残页更糟，纸面发黑发脆，指尖一碰便掉渣。你凑近细看，墨迹和霉斑混在一起，哪是字、哪是污渍，根本分不清。\n\n雨水从窗缝溅到页角，又洇开一片，你只得把日志轻轻合拢。"
        },
        "stairs": {
            "skill": "聆听",
            "fail": "你踏上楼梯，竖起耳朵去捕那声音，可脚下的木板、窗洞灌进的雨、自己的心跳，一齐在耳边嗡响。那声音时左时右，像故意躲着你。\n\n你在台阶上停住，扶手黏腻冰凉，楼上究竟哪里在响，你说不清。"
        }
    },
    "read_log_page1": {
        "read_log_page2": {
            "skill": "图书馆使用",
            "fail": "你翻到后半，想把残页与前面的账目对上，却发现页码早被水泡没了。几张纸前后颠倒，同一行字你读了三遍，意思始终连不起来。\n\n霉味和鱼腥熏得你头昏，你按住额角，那几页仍是一团乱麻。"
        },
        "stairs": {
            "roll": false
        },
        "back_parlor_enter": {
            "roll": false
        }
    },
    "read_log_page2": {
        "salt_circle": {
            "skill": "侦查",
            "fail": "你回到门厅与客厅之间，弯腰去找日志里暗示的那种白色痕迹。可地面到处是水渍和泛白的潮霜，哪一片是有意撒下的，哪一片只是墙根返的碱，你分辨不出。\n\n你跪在冰冷的地板上，指尖沾了一层湿灰。"
        },
        "stairs": {
            "skill": "聆听",
            "fail": "你一步步往上走，想追着那声响找到源头。偏偏楼梯窗洞里灌进一阵狂风，呼啸声塞满了耳朵，连自己的脚步都听不见。\n\n等风势稍歇，你已站在半截楼梯上，四下只剩雨，那声音像从未存在过。"
        },
        "back_parlor_enter": {
            "roll": false
        }
    },
    "listen_ok": {
        "stairs": {
            "skill": "潜行",
            "fail": "你放轻脚步往上走，鞋底却在湿滑的台阶上一溜，膝盖磕在木板上，咚的一声闷响在楼梯间来回撞。楼上的滴答声倏地停了。\n\n你趴在台阶上一动不动。过了许久，那声音才慢吞吞地重新响起，像在等你再出声。"
        }
    },
    "listen_fail": {
        "stairs": {
            "roll": false
        },
        "back_parlor_enter": {
            "roll": false
        }
    },
    "search_ok": {
        "stairs": {
            "roll": false
        },
        "study": {
            "skill": "侦查",
            "fail": "你攥着那把钥匙走进书房，借着手电比对屋里每一处锁孔和刻纹。光线太暗，齿纹在掌心里只是一排冰冷的凸起，与任何东西都对不上。\n\n你来回转了两圈，钥匙被手心焐得微温，书房里依旧一片沉闷的寂静。"
        }
    },
    "search_fail": {
        "stairs": {
            "roll": false
        },
        "letter_drawer": {
            "skill": "侦查",
            "fail": "你再次拉开抽屉，信件挤作一团，信封潮软得像泡过的面皮。你抽出一封，封口一扯就烂，里面的纸早已糊成一块，什么也展不开。\n\n潮纸的边缘在指尖割出一道细口，你缩回手，抽屉里的霉味久久不散。"
        }
    },
    "letter_drawer": {
        "letter_seal": {
            "skill": "侦查",
            "fail": "你把一枚破碎的蜡封凑到光下，可蜡面早被水泡得发白起皱，纹路磨成一片模糊的凹凸。你拿指腹去摸，只摸出黏腻的凉意。\n\n你换了好几个角度，那些纹样始终不肯显形，像一枚被海浪舔平的贝壳。"
        },
        "stairs": {
            "roll": false
        },
        "back_parlor_enter": {
            "roll": false
        }
    },
    "letter_seal": {
        "wax_altar": {
            "skill": "侦查",
            "fail": "你循着记忆去找相似的蜡迹，在昏暗里摸索了好一阵，却只在墙角碰到一堆受潮的旧报纸，惊起几只湿漉漉的蠹虫。\n\n松脂般的气味若有若无，你转了几圈，始终找不准它是从哪个角落飘来的。"
        },
        "stairs": {
            "roll": false
        },
        "back_parlor_enter": {
            "roll": false
        }
    },
    "kitchen": {
        "pantry": {
            "skill": "力量",
            "fail": "储藏间的木门被潮气泡得变了形，死死卡在门框里。你用肩膀撞了三次，门板才猛地让开，刺耳的刮擦声在厨房里炸开，你踉跄着跌进门内。\n\n肩头火辣辣地疼，楼上的滴答声停了好一会儿。黑暗里，一股腥咸扑面而来。"
        },
        "cellar_door": {
            "skill": "侦查",
            "fail": "你在厨房角落找到那扇嵌在地上的铁门，手电光照上去，只见一层厚厚的锈与盐霜，什么都被糊住了。你蹲下细看，冷气从门缝扑来，激得眼眶发涩，泪水糊了视线。\n\n你抹了把脸，铁门还是一块冰冷的锈铁。"
        },
        "laundry": {
            "skill": "侦查",
            "fail": "侧廊尽头的洗衣间没有窗光，手电又在这时暗了下去。你拍了几下，光圈只剩铜钱大小，照到哪里都是一团湿黑，木盆、绳索、墙钩，轮廓都在晃。\n\n你在门口站着等眼睛适应，只听见水滴落进盆里，一声比一声沉。"
        },
        "back_intro": {
            "roll": false
        }
    },
    "pantry": {
        "pantry_jar": {
            "skill": "侦查",
            "fail": "架上的罐子挨挨挤挤，标签褪得一片惨白。你一只只拿起来看，玻璃上的水汽一抹又起，罐中的东西始终隔着一层灰雾。\n\n手腕一软，一只空瓶险些滑落，你慌忙按住，再不敢多碰。"
        },
        "kitchen": {
            "roll": false
        },
        "back_intro": {
            "roll": false
        }
    },
    "pantry_jar": {
        "kitchen": {
            "roll": false
        },
        "parlor_enter": {
            "roll": false
        }
    },
    "cellar_door": {
        "cellar_smell": {
            "skill": "侦查",
            "fail": "你贴近门缝深吸一口，那股气味太冲，直钻进鼻腔深处，呛得你连连咳嗽，眼泪都涌了出来。等缓过气，鼻子里只剩一片麻木的咸涩，什么也分不出了。\n\n你捂着口鼻退开半步，铁门后的冷气仍一阵阵往外渗。"
        },
        "coal_bin": {
            "skill": "侦查",
            "fail": "煤仓里黑得像被墨灌满，手电光一照进去就被吞掉大半。你往里探身，脚下踩到一块松动的煤，一个趔趄，慌忙扶住冰冷的墙。\n\n等站稳了，你满手是灰，只看清脚边一堆堆黑煤，别的什么都隐在暗处。"
        },
        "back_kitchen": {
            "roll": false
        }
    },
    "cellar_smell": {
        "kitchen": {
            "skill": "侦查",
            "fail": "你回到厨房，一格格翻找碗柜和搁架，摸到的不是空瓶就是生锈的铁罐。架上的油垢黏住手套，越找越乱，锅碗碰得叮当作响。\n\n你停下手，四周的瓶罐都歪斜着，哪一只也不像你要找的。"
        },
        "stairs": {
            "roll": false
        }
    },
    "coal_bin": {
        "coal_dust": {
            "skill": "侦查",
            "fail": "你伸手抹开煤灰，粉尘腾地扬起，糊满了镜片和眉毛。你眯着眼胡乱擦拭，再看时，那片地方已被自己蹭得一团糟。\n\n黑灰沾满了袖口和手套，怎么拍也拍不掉。"
        },
        "back_cellar_door": {
            "roll": false
        }
    },
    "coal_dust": {
        "kitchen": {
            "roll": false
        },
        "study": {
            "skill": "图书馆使用",
            "fail": "你在书房架上一册册抽出旧账簿，书脊受潮发软，一抽便连带着扯下半排。你蹲在地上逐本翻看，满眼都是褪色的数字与潦草的签名，看不出哪一本是你要的。\n\n寒意从地板爬上膝盖，你合上最后一本，什么也没记住。"
        }
    },
    "laundry": {
        "laundry_tub": {
            "skill": "侦查",
            "fail": "你俯身去看木盆，盆里的黑水一动不动，映出你自己扭曲的脸，挡住了水下的一切。你伸手想拨开水面，又在半途停住，指尖悬着不敢落下。\n\n犹豫间，盆沿的木刺勾破了手套，你缩回手，再看不清什么。"
        },
        "back_kitchen": {
            "roll": false
        }
    },
    "laundry_tub": {
        "kitchen": {
            "roll": false
        },
        "parlor_enter": {
            "roll": false
        }
    },
    "study": {
        "study_desk": {
            "skill": "侦查",
            "fail": "书桌抽屉卡在滑轨里，你一拉，整只抽屉连同桌上的杂物哗啦一声翻倒，纸张、笔杆滚了一地，混进地毯的污渍里。\n\n你跪下去一样样拾，越拾越乱。屋里的霉味和潮墨味搅在一起，叫人心烦意乱。"
        },
        "garden_gate": {
            "roll": false
        },
        "phonograph": {
            "skill": "聆听",
            "fail": "你掀开那台旧留声机的盖子，喇叭里涌出一阵沙沙的杂音，夹着几声断续的刮擦，像指甲划过粗布。\n\n你凑近铜喇叭屏息去听，杂音盖住了一切，耳朵里只剩空洞的嗡鸣。"
        },
        "back_intro": {
            "roll": false
        }
    },
    "study_desk": {
        "garden_well": {
            "roll": false
        },
        "intro": {
            "roll": false
        },
        "parlor_enter": {
            "roll": false
        }
    },
    "phonograph": {
        "phonograph_needle": {
            "skill": "侦查",
            "fail": "你俯身去看唱针，针头细得几乎看不见，手电一照只剩一点刺眼的反光。你想把它托起来细看，手指一抖，针尖在唱片上划出一声尖利的嘶鸣。\n\n你猛地缩手，那声音在屋里回荡了许久才散。"
        },
        "back_study": {
            "roll": false
        }
    },
    "phonograph_needle": {
        "garden_well": {
            "roll": false
        },
        "back_study": {
            "roll": false
        }
    },
    "garden_gate": {
        "garden_well": {
            "roll": false
        },
        "garden_rain": {
            "skill": "侦查",
            "fail": "你在雨里站定，雨水顺着帽檐成串淌下，挡在眼前像一道晃动的珠帘。花园里的一切都只剩深浅不一的灰影，树、矮墙、远处的海，分不出边界。\n\n鞋子陷进泥里越来越深，你冻得牙关打颤，看到的仍只是雨。"
        },
        "back_study": {
            "roll": false
        }
    },
    "garden_rain": {
        "garden_well": {
            "roll": false
        },
        "back_study": {
            "roll": false
        }
    },
    "garden_well": {
        "study": {
            "roll": false
        },
        "stairs": {
            "roll": false
        }
    },
    "wax_altar": {
        "wax_melt": {
            "skill": "侦查",
            "fail": "你俯身凑近那摊蜡，热气混着腥香熏上来，镜片立刻蒙了一层白雾。你摘下眼镜擦拭，再戴上时，蜡面已结起一层灰膜，纹理全都隐在下面。\n\n指尖碰了碰，硬壳冰凉，像什么东西刚刚闭上了眼。"
        },
        "salt_circle": {
            "roll": false
        },
        "back_intro": {
            "roll": false
        }
    },
    "wax_melt": {
        "salt_circle": {
            "roll": false
        },
        "stairs": {
            "roll": false
        }
    },
    "salt_circle": {
        "salt_grain": {
            "skill": "侦查",
            "fail": "你拈起几粒盐凑到眼前，可手指上的潮气让它们转眼化开，在指腹上留下一层黏湿的白痕。再拈，又化。\n\n你看着掌心那点水渍，连盐粒原本的样子都没看清，只尝到空气里一丝苦咸。"
        },
        "stairs": {
            "roll": false
        },
        "back_parlor_enter": {
            "roll": false
        }
    },
    "salt_grain": {
        "stairs": {
            "roll": false
        },
        "back_salt_circle": {
            "roll": false
        }
    },
    "clock_hall": {
        "clock_tick": {
            "skill": "聆听",
            "fail": "你把耳朵贴上冰凉的钟壳，屏息去听。耳中却先灌满了自己的脉搏，咚咚作响，盖过了一切细微的声音。你越想静下来，心跳越重。\n\n良久，你直起身，耳廓冻得发麻，钟壳里有没有回响，你说不准。"
        },
        "back_intro": {
            "roll": false
        }
    },
    "clock_tick": {
        "stairs": {
            "roll": false
        },
        "back_intro": {
            "roll": false
        }
    },
    "roof_leak": {
        "stairs": {
            "roll": false
        },
        "back_stairs": {
            "roll": false
        }
    },
    "wardrobe": {
        "wardrobe_coat": {
            "skill": "侦查",
            "fail": "你把手伸进大衣口袋，摸到的只有一团湿冷的衬布，指尖从磨穿的布缝里穿出去，触到呢料内侧黏滑的潮气。另一只口袋像被缝死了，你摸索半天也找不到开口。\n\n你抽回手，袖口沾满了霉斑的气味。"
        },
        "back_servant_room": {
            "roll": false
        }
    },
    "wardrobe_coat": {
        "stairs": {
            "roll": false
        },
        "bathroom_mirror": {
            "roll": false
        }
    },
    "bathroom_mirror": {
        "mirror_fog": {
            "skill": "侦查",
            "fail": "你用袖子去擦镜面，雾气却擦一片起一片，水珠顺着玻璃淌成一道道泪痕。镜子里只有一个模糊的轮廓，大概是你自己，被水痕拉得细长。\n\n你擦得手臂发酸，镜面依旧灰蒙蒙的，龙头的滴水声在瓷砖间来回弹。"
        },
        "back_servant_room": {
            "roll": false
        }
    },
    "mirror_fog": {
        "stairs": {
            "roll": false
        },
        "back_bathroom_mirror": {
            "roll": false
        }
    },
    "servant_room": {
        "servant_bed": {
            "skill": "侦查",
            "fail": "你趴下去往床底看，弹簧的锈刺勾住了外套，扯得你动弹不得。等你小心解开，床底只是一片积灰的黑暗，手电照进去，灰尘翻飞，什么也看不清。\n\n你撑着冰冷的地板起身，膝上沾了两块深色的潮渍。"
        },
        "wardrobe": {
            "skill": "侦查",
            "fail": "衣柜门一拉开，一股浓重的樟脑与霉味扑出来，呛得你别过脸去。等你回过头，柜里挂满的旧衣层层叠叠，手电只照出一片沉甸甸的暗色呢料。\n\n你拨开几件，衣料湿得坠手，深处仍是一团看不透的黑。"
        },
        "bathroom_mirror": {
            "roll": false
        },
        "back_stairs": {
            "roll": false
        }
    },
    "servant_bed": {
        "wardrobe": {
            "skill": "侦查",
            "fail": "你去拉衣柜，合页锈得发涩，你用力一拽，柜门猛地弹开，撞在墙上一声闷响。你僵在原地，等了很久，楼上没有动静。\n\n再看柜内时，心思早已散了，只看见一片黑沉沉的衣物，像一排低头站着的人。"
        },
        "back_servant_room": {
            "roll": false
        }
    },
    "stairs": {
        "attic_peek": {
            "skill": "侦查",
            "fail": "你踮脚上到最高一级，把眼睛凑向门缝。磷光扑面刺来，眼前顿时炸开一片绿白的光斑，什么形状都化在里面。你下意识闭眼，泪水涌出。\n\n再睁眼时，门缝里只剩一线晃动的光。你按着发烫的眼皮，蹲在门前不敢出声。"
        },
        "stairs_echo": {
            "skill": "聆听",
            "fail": "你停在台阶中段，侧耳去听楼梯间的回声。窗洞里的风一阵阵灌进来，呜呜地在墙间打转，把一切声响都揉成一团含混的低吟。\n\n你等了许久，风不肯停，每一级台阶听上去都一样。"
        },
        "roof_leak": {
            "skill": "侦查",
            "fail": "你仰头去找漏雨的缝隙，水珠却正好落进眼里，冰凉刺痛。你揉着眼睛，再抬头时，天花板上只是一大片深浅不一的水痕，从哪里渗下来，根本看不出。\n\n脖子仰得发僵，雨水仍不紧不慢地滴进脚边的积水里。"
        },
        "servant_room": {
            "roll": false
        },
        "clock_hall": {
            "roll": false
        }
    },
    "stairs_echo": {
        "attic_peek": {
            "skill": "侦查",
            "fail": "你屏息凑近门缝，脚下的台阶却在这时一沉，发出一声轻响。你吓得一缩，脸颊擦过门板，眼睛错开了那道缝。\n\n再凑上去时，门内的光忽然暗了半截，只能看见一片模糊游移的绿影，像隔着一层脏水。"
        },
        "back_stairs": {
            "skill": "意志",
            "fail": "你靠着湿滑的墙壁，想让呼吸慢下来，胸口却像被什么攥住，每一口气都又短又急。门缝里的绿光一明一暗，你的心跳不由自主地跟着它的节拍。\n\n手指在扶手上抓得发白，你仍站在楼梯间，冷汗顺着后颈淌下。"
        }
    },
    "attic_peek": {
        "attic_whisper": {
            "skill": "聆听",
            "fail": "你把耳朵贴上门板，木头冷得像浸过井水。门后只有一片沉闷的潮响，忽高忽低，像隔着很深的水听人说话，任你怎么屏息，也辨不出一个音节。\n\n你的太阳穴突突直跳，只好把脸从门上移开半寸。"
        }
    }
};
