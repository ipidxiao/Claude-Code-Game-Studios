/**
 * 「面具嘉年华」: which actions roll and what a failed roll reads (author, 2026-10-18: every action goes
 * through a choice and a roll; a failed roll leads to its own passage). See ../action_checks.mjs.
 * { [nodeId]: { [choice id or label]: { skill, fail } | { roll: false } } } — roll: false is movement.
 */
export const carnivalOfMasksChecks = {
    "gate": {
        "midway_masked": {
            "roll": false
        },
        "gate_bike_examine": {
            "skill": "侦查",
            "fail": "你蹲下去，手刚碰到车把，栅栏外一阵风扑来，彩带糊了你一脸，车身哐地一声倒向另一侧。\n\n等你把它扶正，车铃还在晃，车筐里黑乎乎一团，借着彩灯的余光什么也辨不清。泥水渗进袖口，冰得你缩回了手。"
        },
        "gate_ticket_booth": {
            "skill": "侦查",
            "fail": "售票亭的抽屉卡在半途，你用力一拽，木框发出一声干哑的呻吟，像有人在亭里清了清嗓子。\n\n你下意识回头，栅栏边空无一人。再看抽屉时，亭顶的阴影正好压在里面，你的手指只摸到一片潮冷，便不敢再往深处探。"
        },
        "gate_banner_flags": {
            "skill": "侦查",
            "fail": "你沿着栅栏一面面看过去，旗子在头顶翻卷得太急，每张笑脸都只露出半边就被风折了回去。\n\n走到第七面时，你已分不清哪面看过、哪面没看。旗绳在木桩上吱吱作响，你仰得脖子发酸，眼前只剩一片晃动的红白。"
        },
        "gate_organ_music": {
            "skill": "聆听",
            "fail": "你停下脚步，屏息去捉那串低音，游艺区那头却忽然爆出一阵尖利的哨声，把风琴整个盖了过去。\n\n哨声停歇时，曲子已换了一段，旋律在帐篷之间来回反弹，辨不出从何处来。你只记得耳膜里残留的嗡鸣，像有人贴着耳廓轻轻呼气。"
        },
        "gate_rain_smell": {
            "skill": "侦查",
            "fail": "你俯身深吸一口，雨后的冷气直灌进鼻腔，呛得你弯腰咳了起来。\n\n等咳意平复，鼻子里只剩泥土与铁锈似的寒味，别的气息都被冲淡了。脚下坑坑洼洼，深浅杂乱，你看了半晌，只看见自己鞋尖在积水里发抖的倒影。"
        }
    },
    "gate_bike_examine": {
        "midway_masked": {
            "roll": false
        },
        "back_gate": {
            "roll": false
        }
    },
    "gate_ticket_booth": {
        "midway_masked": {
            "roll": false
        },
        "back_gate": {
            "roll": false
        }
    },
    "gate_banner_flags": {
        "midway_masked": {
            "roll": false
        },
        "back_gate": {
            "roll": false
        }
    },
    "gate_organ_music": {
        "midway_masked": {
            "roll": false
        },
        "back_gate": {
            "roll": false
        }
    },
    "gate_rain_smell": {
        "midway_masked": {
            "roll": false
        },
        "back_gate": {
            "roll": false
        }
    },
    "midway_masked": {
        "midway": {
            "skill": "意志",
            "fail": "你们抠住面具边缘往下扯，纸面却像吸住了皮肤，每扯开一分，耳边的低语就逼近一寸。\n\n不知过了多久，面具终于脱手落地，你们跪在泥里大口喘气，眼前金星乱冒，彩灯晕成一团团模糊的光。等视线重新聚拢，游艺区的喧闹已在四周响了很久。"
        },
        "tent_approach": {
            "roll": false
        }
    },
    "tent_approach": {
        "midway": {
            "skill": "意志",
            "fail": "指尖刚扣进面具下沿，帐内鼓点猛地一沉，你们的手竟自己松开了，像被别人的念头按住。\n\n第二次、第三次，你们咬着牙硬撕，额角渗出冷汗。面具最终被甩出去时，你们已被人潮推回了游艺区边上，脑中一片空白，刚才走过的路一步也想不起来。"
        },
        "tent": {
            "roll": false
        },
        "tent_canvas_smell": {
            "skill": "侦查",
            "fail": "你们把脸贴近帆布，热胶味冲得太猛，眼眶一酸，泪水把视线糊成一片。\n\n退开半步揉过眼再凑上去时，鼻腔已经麻木，只闻得到面具里自己闷热的呼吸。帆布在风里鼓起又塌下，像有什么东西在另一侧轻轻推了你们一把。"
        },
        "tent_backstage_door": {
            "skill": "锁匠",
            "fail": "你们摸到侧门，指尖刚沿门缝滑向锁孔，一股热烟便从缝里喷出，烫得人猛缩回手。\n\n再伸过去时，锁孔周围一片黏冷，摸来摸去也摸不清形状，更别提里头的机括。帐内鼓声一下下敲在门板上，震得你们掌心发麻。"
        }
    },
    "tent_canvas_smell": {
        "tent": {
            "roll": false
        },
        "backstage": {
            "roll": false
        },
        "back_tent_approach": {
            "roll": false
        }
    },
    "tent_backstage_door": {
        "tent": {
            "roll": false
        },
        "backstage": {
            "roll": false
        },
        "back_tent_approach": {
            "roll": false
        }
    },
    "midway": {
        "trailer": {
            "skill": "侦查",
            "fail": "你们绕过一排熄灭的摊位走向拖车，脚下却踩翻了一只空铁桶，哐啷声滚出老远。\n\n你们僵在原地，等那声响散尽才敢推开车门。车内闷热昏暗，煤油灯被风扑得忽明忽暗，你们眯着眼，只看清门边一角，其余都沉在晃动的黑里。"
        },
        "tent_approach": {
            "roll": false
        },
        "midway_wax_stall": {
            "skill": "侦查",
            "fail": "你们绕到摊子侧面，蜡像的玻璃眼珠恰在此刻转过来，正对着你们，几个人同时僵住。\n\n等回过神蹲下去，摊底一片漆黑，彩灯照不到那里。指尖只触到粗糙的木板和一层冰凉的油腻，什么也分辨不出，那对眼珠却一直没有转开。"
        },
        "midway_clown_alley": {
            "skill": "侦查",
            "fail": "巷子太窄，两侧悬着的面具几乎蹭到你们的帽檐。侧身挤进去时风一吹，面具相互叩击，噼啪声像一串压低了的笑。\n\n你们被那声音扰得心神不宁，脚步越走越快，巷底那团影子始终看不清轮廓，地上的颜色也在昏光里混成了一片泥。"
        },
        "midway_game_booth": {
            "skill": "侦查",
            "fail": "你们在射击摊前站定，摊顶的灯泡啪地爆了一只，碎玻璃溅在柜台上，那一排靶子瞬间沉进暗处。\n\n你们捂着脸退了两步，再凑上前时，只剩柜台后一个僵立的轮廓，手里似乎攥着什么，却怎么也看不清。"
        },
        "midway_ferris_shadow": {
            "skill": "侦查",
            "fail": "你们仰头去看那节高悬的吊舱，冷风正从铁架间灌下来，吹得眼睛直流泪。\n\n舱门在高处一开一合，铁锈屑簌簌落进衣领。你们揉着眼来回换了几个角度，舱里始终是一团黑，帆布上的影子被彩灯搅得七零八落，聚不成形。"
        },
        "midway_fortune_teller": {
            "skill": "侦查",
            "fail": "你们掀开占卜帐篷的帘子，里面的熏香浓得发苦，一口吸进去便呛出了眼泪。\n\n水晶球蒙着一层雾气，你们凑近时呼出的白气又给它添了一层。桌上的纸牌被帘外灌进的风掀动，几张翻了面，你们手忙脚乱去按，却已记不清它们原先的次序。"
        },
        "midway_popcorn_stand": {
            "skill": "侦查",
            "fail": "爆米花摊的炉子还烧着，热浪扑面，你们刚凑近桶口，一股焦甜的烟就熏得人睁不开眼。\n\n你们用袖子掩着口鼻往后退，鞋底在摊前打了个滑，险些撞翻摊车。站稳时炉火噼啪一响，烟更浓了，桶里和地上都隐在一片灰白之后。"
        },
        "midway_carousel_halt": {
            "skill": "侦查",
            "fail": "你们攀上木马的台座，脚下木板突然往下一沉，整座转盘吱呀着挪了半寸，吓得所有人抓紧了铜杆。\n\n转盘再没动静，可你们的手心已湿透。马身的漆在彩灯下反着一层油光，你们俯身去看马腹，只看见自己扭曲的倒影晃来晃去。"
        },
        "midway_sideshow_mirror": {
            "skill": "侦查",
            "fail": "一踏进镜屋，无数个你们便同时迈步，前后左右全是肩膀与后脑，分不清哪条才是路。\n\n你们伸手摸着镜面前进，掌心按出一串雾印，绕过几个弯，竟又回到入口附近。走廊尽头仍在远处，镜中只有你们越来越苍白的脸。"
        }
    },
    "midway_wax_stall": {
        "back_midway": {
            "roll": false
        }
    },
    "midway_clown_alley": {
        "tent_approach": {
            "roll": false
        },
        "trailer": {
            "skill": "侦查",
            "fail": "从小丑巷出来，你们抄近路钻向拖车，彩粉沾了满鞋，每一步都在木踏板上留下一声黏响。\n\n车门比想象中沉，推开时铰链尖叫了一声。你们在门槛上站了太久，眼睛迟迟适应不了里面的昏光，只觉得身后游艺区的喧闹一下子远了。"
        },
        "back_midway": {
            "roll": false
        }
    },
    "midway_game_booth": {
        "trailer": {
            "skill": "侦查",
            "fail": "你从靶后绕向拖车区，幕布的破边勾住了衣袖，扯了几下才挣脱，布帛撕裂声在夜里格外刺耳。\n\n赶到拖车前，车窗里的灯已压得很低。你推门而入，门板反弹回来撞上肩膀，一阵钝痛里，车厢深处的轮廓只剩模糊一团。"
        },
        "back_midway": {
            "roll": false
        }
    },
    "midway_ferris_shadow": {
        "tent_approach": {
            "roll": false
        },
        "trailer": {
            "skill": "侦查",
            "fail": "摩天轮的铁架在头顶咯吱一响，你们本能地抬头，脚下一滑，膝盖重重磕在拖车的铁踏级上。\n\n疼得眼前发白的那几秒里，车门已被撞开了一道缝。你们扶着门框挤进去，腿还在打颤，满眼是摇摆的灯影，什么都落不到实处。"
        },
        "back_midway": {
            "roll": false
        }
    },
    "midway_fortune_teller": {
        "tent_approach": {
            "roll": false
        },
        "trailer": {
            "skill": "侦查",
            "fail": "占卜帐篷的帘子在身后合拢，你们一时没辨清方向，在两排拖车间绕了个来回才找到那扇门。\n\n门内很静，静得能听见汗水从面颊滑落。你们在门口迟疑太久，屋里那盏灯晃了一下，暗了半截，眼前便只剩阴影叠着阴影。"
        },
        "back_midway": {
            "roll": false
        }
    },
    "midway_popcorn_stand": {
        "tent_approach": {
            "roll": false
        },
        "back_midway": {
            "roll": false
        }
    },
    "midway_carousel_halt": {
        "trailer": {
            "skill": "侦查",
            "fail": "你们离开木马时，底座某处的铁链突然松脱，叮当乱响，引得远处一阵笑声停了半拍。\n\n你们屏着气摸到拖车门前，门把冰得粘手。挤进车厢时有人碰倒了门边一只空瓶，慌忙去扶，再抬眼，里面的光已暗得只剩一线。"
        },
        "back_midway": {
            "roll": false
        }
    },
    "midway_sideshow_mirror": {
        "tent_approach": {
            "roll": false
        },
        "back_midway": {
            "roll": false
        }
    },
    "wax_fail": {
        "trailer": {
            "skill": "侦查",
            "fail": "蜡像的死寂还压在心口，你们走向拖车的脚步越来越慢，像有一只手在背后往回拽。\n\n车门半掩，你们侧身挤入，鼻腔先被一股闷浊的热气堵住，眼睛酸涩得睁不开。你们背贴门板站了许久，车内的一切仍只是一团晃动的暗影。"
        },
        "tent_approach": {
            "skill": "力量",
            "fail": "你们硬往主帐篷冲，人群里却有几具蜡制的身躯纹丝不动，像钉进地里的木桩，肩膀撞上去一阵生疼。\n\n被弹开、绕行、又被挡住，等终于挤到帐门前，你们已满身汗湿，胸口闷得发慌，只能先停在门边的暗处喘匀这口气。"
        }
    },
    "wax_ok": {
        "backstage": {
            "skill": "潜行",
            "fail": "你们贴着摊位的背阴处溜向后台，一只脚却绊上了地上的电线，远处一串彩灯应声闪了两下。\n\n你们伏在帆布后不敢动，直到风琴重新压住一切杂音。再摸到后台入口时，里面一片昏黑，你们只能蹲在门帘下，等眼睛慢慢适应。"
        },
        "trailer": {
            "skill": "侦查",
            "fail": "蜡像褪色得比你们想的还快，你们匆忙离开摊位，一路不住回头，生怕它再开口。\n\n到拖车前时呼吸已乱，推门的力道太猛，门板撞在内壁上发出闷响。里面的灯随之一颤，你们缩在门边，眼前只剩忽明忽暗的光斑，看不真切。"
        }
    },
    "trailer": {
        "confront": {
            "skill": "说服",
            "fail": "你们清了清嗓子，把质问说出口，声音却在满车的镜面间撞来撞去，听上去又虚又薄。\n\n那人始终没有回头，只从喉咙里滚出一声似笑非笑的气音。你们攥紧了拳，话头被那声音生生截断，只得硬着头皮再上前一步。"
        },
        "trailer_mirror_wall": {
            "skill": "侦查",
            "fail": "你们贴近镜墙，呼出的热气立刻在镜面上蒙了一层白雾，越想看清，雾就越厚。\n\n用袖口去擦，镜面却像沾了油，擦出一道道浑浊的弧痕。几次之后，镜里的人影只剩模糊的色块，连哪个是自己都分辨不出。"
        },
        "trailer_mask_rack": {
            "skill": "侦查",
            "fail": "你们挨个去数那排面具，数到一半，车厢随风一晃，挂钩齐齐轻响，几张面具同时转了个角度。\n\n只好从头再数，可目光在一张张相似的脸上滑过，越数越乱，到最后连起点在哪儿都记不清，只觉得被看得浑身发毛。"
        },
        "trailer_sewing_kit": {
            "skill": "侦查",
            "fail": "你们俯身去翻工具台，一只线轴骨碌碌滚下桌沿，伸手去接时，指腹被台面上什么尖东西扎出一颗血珠。\n\n疼痛让你们缩回了手。灯光恰好被一道影子挡住，台面上的金属零件在暗处混成一片，你们按着伤口，没敢再往里摸。"
        },
        "trailer_boss_journal": {
            "skill": "图书馆使用",
            "fail": "日记的纸页被潮气粘成了一沓，你们小心地往开揭，第一页就撕下一角，墨迹顺着裂口洇开。\n\n字写得极潦草，挤在页边，又被水渍泡得发胀。你们翻了十几页，眼睛酸涩，读进脑子的只有零碎的笔画，拼不出一句完整的话。"
        }
    },
    "trailer_mirror_wall": {
        "confront": {
            "skill": "说服",
            "fail": "你从镜前转身，想开口质问，镜里那个慢半拍的你却还张着嘴，喉咙一紧，词句全卡在了舌根。\n\n你咽了几回唾沫才挤出声音，话说得结结巴巴，毫无分量。对面那人轻轻抬了抬手，像在示意你继续，又像根本没在听。"
        },
        "back_trailer": {
            "roll": false
        }
    },
    "trailer_mask_rack": {
        "confront": {
            "skill": "说服",
            "fail": "你攥着刚数过的数目开口，可一抬头，那排面具的空眼洞全对着你，到了嘴边的数字竟突然想不起来。\n\n你的质问前言不搭后语，在闷热的车厢里很快没了声息。对方慢悠悠地侧过脸，那份从容让你后颈一阵发凉。"
        },
        "back_trailer": {
            "roll": false
        }
    },
    "trailer_sewing_kit": {
        "confront": {
            "skill": "说服",
            "fail": "你把那根弯针举到灯下，想借它逼对方开口，指尖却一抖，针滑落在地，滚进了机器底下。\n\n你弯腰去够，再直起身时气势已泄了大半。说出的每句话都像打在湿棉絮上，对面只是低低地笑，笑声和机器的空转搅在一起。"
        },
        "back_trailer": {
            "roll": false
        }
    },
    "trailer_boss_journal": {
        "confront": {
            "skill": "说服",
            "fail": "你把日记摔在桌上，声音却比预想的发颤，摊开的那一页被灯烤得卷起了边，自己慢慢合上了。\n\n你的指控没能落地。对方连眼皮都没抬，只伸出一根手指，把日记往你这边推了半寸，仿佛那不过是一本无关紧要的旧账簿。"
        },
        "back_trailer": {
            "roll": false
        }
    },
    "steal_ok": {
        "tent_approach": {
            "roll": false
        },
        "backstage": {
            "roll": false
        }
    },
    "confront": {
        "fight": {
            "skill": "斗殴",
            "fail": "你们扑上去，拳头却像砸进一团湿冷的帆布，力道全被吞没，反倒震得自己腕骨生疼。\n\n那东西一挥手，你们便撞翻了身后的椅子，后脑磕在镜框上，耳中嗡嗡作响。等撑着地爬起来，满车只剩晃荡的灯和远去的尖笑，地上落着一层细碎的白。"
        },
        "tent_approach": {
            "skill": "话术",
            "fail": "你们挤出笑脸，顺着他的话头应承，可嗓音发干，一句奉承说到一半便露了怯。\n\n那张没有脸的脸朝你们偏了偏，像在细细品味这份拙劣。他没有拦，也没有让路，你们只能在他的注视下，一步步退出拖车，背脊冷汗直流，一路走进主帐篷的门影里。"
        },
        "confront_invitation_card": {
            "skill": "侦查",
            "fail": "那张卡刚递到眼前，车里的灯就暗了一截，烫金的字在昏光里只剩一片刺眼的反光。\n\n你们把卡侧过来、斜过去，金箔的闪光始终盖住底下的东西。指尖越捏越紧，卡纸被汗浸软，边角卷了起来，上头印着什么仍看不分明。"
        }
    },
    "confront_invitation_card": {
        "fight": {
            "skill": "斗殴",
            "fail": "你们把卡往地上一摔，抢先动手，卡纸的边缘却像刀片，掠过指节划开一道口子，血滴得满手都是。\n\n就这一迟疑，对方的身形已鼓胀起来，一记横扫把你们掀到镜墙上，玻璃哗哗震响。晕头转向地爬起时，只听见尖笑远去，脚下沙沙作响，像踩着一层碎霜。"
        },
        "tent_approach": {
            "skill": "话术",
            "fail": "你们把卡收进怀里，装出受宠若惊的样子，舌头却不听使唤，「荣幸」两个字说得像在讨饶。\n\n他低低地笑出声，伸手替你们理了理衣领，指尖冷得像井水。你们几乎是逃一般离开拖车，走到帐篷前时双腿仍在发软，只得在门边的阴影里停住。"
        },
        "back_confront": {
            "roll": false
        }
    },
    "fight": {
        "backstage": {
            "skill": "追踪",
            "fail": "你们循着那串尖笑追出去，可帐篷之间绳索纵横，几步之后，笑声便从四面八方同时传来。\n\n你们在帆布的夹缝里撞来撞去，地上的碎屑早被踩散，再辨不出去向。等终于摸到后台的门帘，喘息声大得吓人，里面昏暗一片，那东西早不知藏到了何处。"
        },
        "fight_scatter_salt": {
            "skill": "侦查",
            "fail": "你们蹲下去看，鼻尖凑得太近，一口气呼出，地上的细屑便扬了起来，迷得人眼睛刺痛。\n\n等泪水流干，粉末已被风卷得七零八落，和泥土、木屑混作一堆。你们用指尖拨了几下，只沾了满手冰凉的灰，看不出个所以然。"
        }
    },
    "fight_scatter_salt": {
        "backstage": {
            "skill": "追踪",
            "fail": "你们拍掉靴上的粉末，顺着地上的白痕追去，可那痕迹出了拖车便被夜露泡化，散成一片斑驳。\n\n你们在湿草间来回辨认，白白耗去许多工夫。帐内鼓点越敲越急，最后只能凭着声响硬闯到后台入口，掀帘时手还在发抖。"
        },
        "tent_approach": {
            "roll": false
        }
    },
    "tent": {
        "stage_approach": {
            "roll": false
        },
        "backstage": {
            "roll": false
        },
        "tent_seat_rows": {
            "skill": "侦查",
            "fail": "你们沿着座位间的窄道往里走，每经过一排，蜡人的头便像装了轴似的齐齐转过来，目光不由得被那一双双眼窝拽走。\n\n走到尽头才惊觉，自己根本没看清他们膝上和手里有什么，只记得那种被一路目送的感觉，凉意至今还贴在后颈上。"
        },
        "tent_stage_lights": {
            "skill": "侦查",
            "fail": "你们仰头去看灯架，正对上一盏刚转过来的聚光灯，白光劈面，眼前顿时只剩一团灼烧的残影。\n\n你们捂着眼退到座位后，好一会儿才勉强看清近处。再往上望，灯架在热气里扭曲晃动，细处一概模糊，脖颈却已僵得发疼。"
        },
        "tent_curtain_rope": {
            "skill": "侦查",
            "fail": "你们摸到幕布边，拉绳却正巧被人从另一侧扯动，粗绳在掌心猛地一蹿，磨得皮肉火辣辣地疼。\n\n攥着发红的手退开时，绳子已升上半空，在暗处轻轻晃荡。幕后传来一阵窸窣，随即归于沉寂，你们站在原地，什么也没摸清。"
        }
    },
    "tent_seat_rows": {
        "stage_approach": {
            "roll": false
        },
        "backstage": {
            "roll": false
        },
        "back_tent": {
            "roll": false
        }
    },
    "tent_stage_lights": {
        "stage_approach": {
            "roll": false
        },
        "back_tent": {
            "roll": false
        }
    },
    "tent_curtain_rope": {
        "stage_approach": {
            "roll": false
        },
        "backstage": {
            "roll": false
        },
        "back_tent": {
            "roll": false
        }
    },
    "backstage": {
        "backstage_prop_crate": {
            "skill": "力量",
            "fail": "你们把随手捡来的铁条塞进箱缝，压上全身的力气，箱盖却纹丝不动，铁钉在木头里吱吱叫着，像在嘲弄。\n\n铁条猛地一滑，你们踉跄着撞上身后的模具架，几只模子哐当落地。在镜中那张面孔的注视下，你们揉着撞疼的肋骨，箱子依旧紧闭如初。"
        },
        "backstage_costume_rack": {
            "skill": "侦查",
            "fail": "你们拨开戏服，衣架上的布料一件压着一件，沉甸甸地垂下来，扑出一股陈年的樟脑与汗味。\n\n翻了一阵，衣袖与衣摆缠作一团，分不清哪件属于谁。架子忽然吱嘎一声歪向一边，你们赶紧伸手扶住，再顾不上细看。"
        },
        "backstage_mirror_core": {
            "skill": "神秘学",
            "fail": "你们凑近那面镜，镜中流转的脸太多太快，盯得久了，胃里便翻江倒海，不得不别开眼。\n\n绕到镜背时，寒气从镜框里一阵阵渗出，冻得指尖发木。你们摸着框上凹凸的纹路，怎么也拼不成一个认得的形状，只觉那冷意顺着手臂往心口爬。"
        },
        "backstage_youth_clothes": {
            "skill": "侦查",
            "fail": "那堆衣物比看上去更沉，你们刚掀起一件外套，下面的衣服便塌下来，散了一地。\n\n你们跪着一件件去捡，口袋里的东西不知何时滑出，又被踩进衣堆，翻来翻去只摸到冰凉的纽扣和湿透的布料。想到这些衣服的主人，手越翻越慢。"
        }
    },
    "backstage_prop_crate": {
        "back_backstage": {
            "roll": false
        }
    },
    "backstage_costume_rack": {
        "back_backstage": {
            "roll": false
        }
    },
    "backstage_mirror_core": {
        "back_backstage": {
            "roll": false
        }
    },
    "backstage_youth_clothes": {
        "stage_approach": {
            "roll": false
        },
        "back_backstage": {
            "roll": false
        }
    },
    "stage_approach": {
        "stage": {
            "roll": false
        },
        "backstage": {
            "roll": false
        },
        "stage_spotlight": {
            "skill": "侦查",
            "fail": "你们踏进聚光灯的光圈，热浪像一张湿毯裹上来，汗水立刻淌进眼里，蛰得人睁不开。\n\n你们眯着眼想去感觉些什么，耳边却只有自己擂鼓般的心跳。光太亮，台下的一切都退进漆黑里，你们在光里站了许久，像被钉在展台上的标本。"
        },
        "stage_audience_wax": {
            "skill": "侦查",
            "fail": "你们的目光扫过观众席，一排排面具在脚灯的热浪里微微扭曲，像隔着一层流动的水。\n\n想数清近处几排，可每当视线停住，就有一张面具似乎偏了一偏，引着你们去看下一张。几番下来，眼睛被灯烤得干涩，脚下与座间的暗处一概没顾上。"
        }
    },
    "stage_spotlight": {
        "stage": {
            "roll": false
        },
        "back_stage_approach": {
            "roll": false
        }
    },
    "stage_audience_wax": {
        "stage": {
            "roll": false
        },
        "back_stage_approach": {
            "roll": false
        }
    },
    "stage": {
        "stage_missing_youth": {
            "skill": "侦查",
            "fail": "你们走近最前面的少年，脚灯恰在这时轰地窜高，热光逼得你们抬臂遮脸，连退两步。\n\n再上前时，谁也不敢碰他，只隔着一臂远打量。那张空白的面具在光里白得晃眼，你们看得眼眶发烫，像隔着一层雾，连他身上哪里不对劲都说不上来。"
        },
        "midway": {
            "skill": "闪避",
            "fail": "你们转身往台下撤，蜡制的观众却齐刷刷站了起来，僵硬的胳膊横在过道上，一只蜡手攥住了你们的衣角。\n\n挣开时布料撕裂，有人摔在台阶上，膝盖磕得发麻。一路跌跌撞撞冲出帐篷，回到游艺区时满身蜡渍，惊魂未定，四周的喧闹恍如隔着厚厚的玻璃。"
        }
    },
    "stage_missing_youth": {
        "midway": {
            "skill": "闪避",
            "fail": "你刚退到台口，脚下的暗扣忽然一弹，地板翘起一角，你一脚踩空，整个人歪向幕布。\n\n幕布裹住你半边身子，挣了好几下才脱身，肩膀撞在立柱上，疼得眼前发黑。等你摸出帐篷，回到游艺区的彩灯下，耳中仍是那阵笑声，脚步虚浮得像踩在棉上。"
        },
        "back_stage": {
            "roll": false
        }
    }
};
