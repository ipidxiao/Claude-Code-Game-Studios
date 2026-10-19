import { createInvestigatorRecord } from '../state/char_record.mjs';
import { CoCStateAccessor } from '../state/accessor.mjs';
import { CoCEngine } from '../coc.mjs';
import { CoCExperiences } from '../data/experiences.mjs';
import { startScenarioById } from '../scenario/ensure_runner.mjs';

export const CoCCreator = (function(State, Engine, Vue) {
    const CHARACTER_PRESETS = Object.freeze([
        {
            name: '私家侦探', label: '🔍 私家侦探', era: '1920s',
            job: { name: '私家侦探', skills: ['侦查','手枪','心理学','潜行','法律','乔装','汽车驾驶'] },
            attrs: { STR:50, CON:60, SIZ:50, DEX:60, APP:50, INT:70, POW:60, EDU:65, LUCK:50 },
            age: 35,
            skillPts: { '侦查':70, '手枪':60, '心理学':55, '潜行':50, '法律':40, '乔装':35, '汽车驾驶':45, '斗殴':40, '闪避':35 },
            desc: '雨夜办公室，最后一封委托信——这次案子不对劲。', avatar: '🕵️'
        },
        {
            name: '学者教授', label: '📖 学者教授', era: '1920s',
            job: { name: '教授', skills: ['图书馆使用','神秘学','外语','历史','考古学','心理学'] },
            attrs: { STR:40, CON:45, SIZ:50, DEX:55, APP:55, INT:80, POW:55, EDU:85, LUCK:50 },
            age: 45,
            skillPts: { '图书馆使用':80, '神秘学':65, '外语':60, '历史':55, '考古学':45, '心理学':40, '侦查':35, '说服':30 },
            desc: '密斯卡塔尼克大学的禁书区，藏着你永远不该翻阅的东西。', avatar: '📖'
        },
        {
            name: '退役军人', label: '🎖️ 退役军人', era: '1920s',
            job: { name: '士兵/陆战队', skills: ['斗殴','步枪/霰弹枪','急救','生存','攀爬','游泳','闪避'] },
            attrs: { STR:70, CON:75, SIZ:60, DEX:55, APP:45, INT:55, POW:50, EDU:55, LUCK:50 },
            age: 28,
            skillPts: { '斗殴':70, '步枪/霰弹枪':60, '急救':50, '生存':55, '攀爬':40, '游泳':35, '闪避':45, '投掷':40 },
            desc: '从弗兰德斯战壕活着回来，但有些恐怖超越了战争本身。', avatar: '🎖️'
        }
    ]);

    let applyPreset = (preset) => {
        if (!State || !Engine || !Vue) return;
    };

    if (!State || !Engine || !Vue) return { CHARACTER_PRESETS, applyPreset };
    const { computed, nextTick, watch, ref } = Vue;
    const { draftChar, gameState, activeCreatorTab } = State;
    const notify = (message, type = 'warning') => State.showToast ? State.showToast(message, type) : console.warn(message);
    
    let radarChartInstance = null;
    const chartUnavailable = ref(typeof Chart === 'undefined' || window.__cocChartLoadFailed);
    const showSTImport = ref(false);

    // 💡 智能过滤：根据当前选择的时代，过滤经历包
    const availableExperiences = computed(() => {
        let allExp = CoCExperiences || [];
        let currentEra = draftChar.era || "1920s";
        return allExp.filter(exp => {
            if (!exp.era) return true;
            return exp.era.includes("所有") || exp.era.some(e => currentEra.includes(e));
        });
    });

    // 💡 智能过滤：根据时代自动屏蔽不相关的职业
    const availableJobs = computed(() => {
        let allJobs = Engine.Occupations || [];
        let currentEra = draftChar.era || "1920s";
        
        // 时代特征关键字提取
        const modernKeywords = ["现代", "网络主播", "YouTuber", "无人机", "网约车", "SWAT", "骇客", "计算机", "IT", "程序员", "CSI", "网络"];
        const gaslightKeywords = ["1890s", "维多利亚", "煤气灯", "马车夫"];

        return allJobs.filter(job => {
            if (currentEra === "1920s") {
                // 1920s 禁用现代和煤气灯职业
                return !modernKeywords.some(kw => job.name.includes(kw)) && !gaslightKeywords.some(kw => job.name.includes(kw));
            } else if (currentEra === "1890s") {
                // 1890s 禁用现代职业
                return !modernKeywords.some(kw => job.name.includes(kw));
            } else if (currentEra === "现代") {
                // 现代禁用煤气灯时代专属职业
                return !gaslightKeywords.some(kw => job.name.includes(kw));
            }
            return true;
        });
    });

    // 💡 监听时代变化：如果切换了时代导致当前职业不可用，自动重置职业
    watch(() => draftChar.era, () => {
        if (draftChar.job) {
            const isValid = availableJobs.value.some(j => j.name === draftChar.job.name);
            if (!isValid) {
                draftChar.job = null;
                draftChar.skillAllocations = {}; // 重置加点
            }
        }
        if (draftChar.expPackage) {
            const isValidExp = availableExperiences.value.some(e => e.name === draftChar.expPackage.name);
            if (!isValidExp) {
                draftChar.expPackage = null;
                draftChar.sanPenalty = 0;
            }
        }
    });

    watch(() => draftChar.attrs.STR, (str) => {
        if (str > 0) renderRadarChart();
    });

    const isVisibleSkill = (skillName) => !Engine.isVisibleSkillName || Engine.isVisibleSkillName(skillName);

    const dynamicSkillNames = computed(() => {
        const extraSkills = [];
        if (draftChar.expPackage && draftChar.expPackage.unlock) {
            draftChar.expPackage.unlock.forEach(s => { if (!extraSkills.includes(s)) extraSkills.push(s); });
        }
        Object.keys(draftChar.skillAllocations || {}).forEach(s => {
            if (!extraSkills.includes(s)) extraSkills.push(s);
        });

        if (Engine.getVisibleSkillNames) return Engine.getVisibleSkillNames(extraSkills);

        const baseSkills = Object.keys(Engine.BaseSkills || {});
        extraSkills.forEach(s => { if (!baseSkills.includes(s)) baseSkills.push(s); });
        return baseSkills.filter(isVisibleSkill);
    });

    const isClassSkill = (skillName) => {
        if (!draftChar.job) return false;
        if (Engine.isClassSkillName) return Engine.isClassSkillName(skillName, draftChar.job.classSkillsString);
        return draftChar.job.classSkillsString.includes(skillName);
    };

    const getAllocationPoints = (skillName, type) => {
        const allocation = draftChar.skillAllocations[skillName];
        const value = Number(allocation && allocation[type]);
        return Number.isFinite(value) ? value : 0;
    };

    const clearOccupationAllocations = () => {
        for (let skill in draftChar.skillAllocations) {
            const allocation = draftChar.skillAllocations[skill];
            if (!allocation) continue;
            allocation.occ = 0;
            if (!allocation.per) delete draftChar.skillAllocations[skill];
        }
    };

    const handleOccupationChange = (nameBefore = draftChar.name) => {
        if (nameBefore && draftChar.name !== nameBefore) draftChar.name = nameBefore;
        if (draftChar.attrs.STR > 0) renderRadarChart();
    };

    watch(() => draftChar.job ? draftChar.job.name : null, (newJobName, oldJobName) => {
        if (newJobName !== oldJobName) clearOccupationAllocations();
        handleOccupationChange();
    });

    watch(() => gameState.currentScreen, (screen) => {
        if (screen === 'creator' && draftChar.attrs.STR > 0) renderRadarChart();
    });

    const pointStats = computed(() => {
        let occMax = draftChar.job ? Math.max(0, Number(draftChar.job.calcPoints(draftChar.attrs)) || 0) : 0;
        let bonus = draftChar.expPackage ? Number(draftChar.expPackage.bonusPoints) || 0 : 0;
        let perMax = Math.max(0, (Number(draftChar.attrs.INT) || 0) * 2 + bonus);
        let occSpent = 0; let perSpent = 0;
        for (let skill in draftChar.skillAllocations) {
            if (!isVisibleSkill(skill)) continue;
            occSpent += getAllocationPoints(skill, 'occ');
            perSpent += getAllocationPoints(skill, 'per');
        }
        const occRemainRaw = occMax - occSpent;
        const perRemainRaw = perMax - perSpent;
        return {
            occMax, perMax, occSpent, perSpent,
            occRemainRaw, perRemainRaw,
            occRemain: Math.max(0, occRemainRaw),
            perRemain: Math.max(0, perRemainRaw),
            occOverspent: Math.max(0, -occRemainRaw),
            perOverspent: Math.max(0, -perRemainRaw)
        };
    });

    const isPointAllocationComplete = computed(() => pointStats.value.occRemainRaw === 0 && pointStats.value.perRemainRaw === 0);

    const getSkillTotal = (skillName) => {
        let base = Engine.getSkillValue(draftChar, skillName); // 使用新的Engine.getSkillValue来获取基础值
        let alloc = draftChar.skillAllocations[skillName] || { occ: 0, per: 0 };
        return base + alloc.occ + alloc.per;
    };

    const applyExperience = () => {
        if (!draftChar.expPackage) { draftChar.sanPenalty = 0; draftChar.derived.san = draftChar.attrs.POW; return; }
        draftChar.sanPenalty = Engine.parseDice(draftChar.expPackage.sanLoss);
        draftChar.derived.san = Math.max(0, draftChar.attrs.POW - draftChar.sanPenalty);
    };

    let _autoAddTimer = null;
    const startAutoAdd = (skillName, type) => {
        // M-008 FIX: cancel previous auto-add before starting new skill
        if (_autoAddTimer) { clearTimeout(_autoAddTimer); clearInterval(_autoAddTimer); _autoAddTimer = null; }
        // First immediate add
        addSkillPoint(skillName, type);
        // Then repeat every 80ms after 300ms initial delay
        _autoAddTimer = setTimeout(() => {
            _autoAddTimer = setInterval(() => addSkillPoint(skillName, type), 80);
        }, 300);
    };
    const stopAutoAdd = () => {
        if (_autoAddTimer) {
            clearTimeout(_autoAddTimer);
            clearInterval(_autoAddTimer);
            _autoAddTimer = null;
        }
    };
    const addSkillPoint = (skillName, type) => {
        if (draftChar.attrs.STR === 0) { notify("请先掷骰决定基础属性！"); return; }
        if (!draftChar.skillAllocations[skillName]) draftChar.skillAllocations[skillName] = { occ: 0, per: 0 };
        
        if (type === 'occ') {
            if (!draftChar.job) { notify("请先选择职业！"); return; }
            
            // 💡 智能本职判定：支持父子技能继承（如职业有"射击"，允许给"手枪"加本职点）
            if (!isClassSkill(skillName)) { notify("此技能不是本职技能！"); return; }
            if (pointStats.value.occRemain >= 5 && getSkillTotal(skillName) + 5 <= 99) draftChar.skillAllocations[skillName].occ += 5;
        } else if (type === 'per') {
            if (pointStats.value.perRemain >= 5 && getSkillTotal(skillName) + 5 <= 99) draftChar.skillAllocations[skillName].per += 5;
        }
    };

    const removeSkillPoint = (skillName, type) => {
        if (draftChar.skillAllocations[skillName] && draftChar.skillAllocations[skillName][type] >= 5) draftChar.skillAllocations[skillName][type] -= 5;
    };

    const getSkillOcc = (skillName) => getAllocationPoints(skillName, 'occ');
    const getSkillPer = (skillName) => getAllocationPoints(skillName, 'per');
    const isUnlockedSkill = (skillName) => draftChar.expPackage && draftChar.expPackage.unlock && draftChar.expPackage.unlock.includes(skillName);

    const renderRadarChart = () => {
        nextTick(() => {
            const paint = (retriesLeft = 3) => {
                if (typeof Chart === 'undefined' || window.__cocChartLoadFailed) {
                    chartUnavailable.value = true;
                    return;
                }
                chartUnavailable.value = false;
                nextTick(() => {
                    const ctx = document.getElementById('radarChart');
                    if (!ctx) {
                        if (retriesLeft > 0) nextTick(() => paint(retriesLeft - 1));
                        return;
                    }
                    const dataValues = [
                        draftChar.attrs.STR, draftChar.attrs.CON, draftChar.attrs.SIZ,
                        draftChar.attrs.DEX, draftChar.attrs.APP, draftChar.attrs.INT,
                        draftChar.attrs.POW, draftChar.attrs.EDU
                    ];
                    if (radarChartInstance && radarChartInstance.canvas !== ctx) {
                        radarChartInstance.destroy();
                        radarChartInstance = null;
                    }
                    if (radarChartInstance) {
                        radarChartInstance.data.datasets[0].data = dataValues;
                        radarChartInstance.update();
                    } else {
                        radarChartInstance = new Chart(ctx, {
                            type: 'radar',
                            data: {
                                labels: ['力量STR', '体质CON', '体型SIZ', '敏捷DEX', '外貌APP', '智力INT', '意志POW', '教育EDU'],
                                datasets: [{ label: '能力评估', data: dataValues, backgroundColor: 'rgba(240, 173, 78, 0.2)', borderColor: 'rgba(240, 173, 78, 1)', pointBackgroundColor: 'rgba(240, 173, 78, 1)', pointBorderColor: '#fff', }]
                            },
                            options: { responsive: true, maintainAspectRatio: false, scales: { r: { angleLines: { color: 'rgba(255, 255, 255, 0.2)' }, grid: { color: 'rgba(255, 255, 255, 0.1)' }, pointLabels: { color: '#ccc', font: { size: 10 } }, ticks: { display: false, min: 0, max: 100, stepSize: 20 } } }, plugins: { legend: { display: false } } }
                        });
                    }
                });
            };
            paint();
        });
    };

    const rollAllStats = () => {
        let rawAttrs = { STR: Engine.roll3D6x5(), CON: Engine.roll3D6x5(), DEX: Engine.roll3D6x5(), APP: Engine.roll3D6x5(), POW: Engine.roll3D6x5(), LUCK: Engine.roll3D6x5(), SIZ: Engine.roll2D6plus6x5(), INT: Engine.roll2D6plus6x5(), EDU: Engine.roll2D6plus6x5() };
        let age = parseInt(draftChar.age) || 25;
        let finalAttrs = Engine.applyAgeModifiers(rawAttrs, age);
        
        for (let key in finalAttrs) draftChar.attrModifiers[key] = finalAttrs[key] - rawAttrs[key];
        
        Object.assign(draftChar.attrs, finalAttrs);
        draftChar.derived = Engine.calculateDerived(draftChar.attrs, draftChar.age);
        draftChar.skillAllocations = {}; draftChar.job = null; draftChar.expPackage = null; draftChar.sanPenalty = 0;
        renderRadarChart();
    };

    const importPreview = Vue.ref(null);

      const importSTData = () => {
          const text = draftChar.stImportText || "";
          if (!text.trim()) { notify("请输入数据！"); return; }
          let cleanText = text.replace(/^\.st\s*/i, "").trim();

          // 属性映射 中英文
          const attrMapCN = {
              "力量":"STR","体质":"CON","体型":"SIZ","敏捷":"DEX",
              "外貌":"APP","智力":"INT","灵感":"INT","意志":"POW",
              "教育":"EDU","幸运":"LUCK","运气":"LUCK",
              "Strength":"STR","Constitution":"CON","Size":"SIZ","Dexterity":"DEX",
              "Appearance":"APP","Intelligence":"INT","Power":"POW","Education":"EDU","Luck":"LUCK"
          };
          const attrEN = ["STR","CON","SIZ","DEX","APP","INT","POW","EDU","LUCK"];
          // 信息字段
          const infoMapCN = { "姓名":"name","名字":"name","职业":"job","年龄":"age","性别":"gender" };

          const parsed = { attrs: {}, skills: {}, info: {} };
          const eng = (typeof CoCEngine !== "undefined" ? CoCEngine : null);
          const allSkillKeys = Object.keys(eng.BaseSkills || {});

          // 解析信息行 (姓名: 张三)
          const infoReg = /([^\d\s:：\n,，①②③]{1,6})[\s:：]+([^\d\n,，:：]{1,20})/g;
          let m;
          while ((m = infoReg.exec(cleanText)) !== null) {
              const k = m[1].trim(), v = m[2].trim();
              if (infoMapCN[k] && v.length > 0) parsed.info[infoMapCN[k]] = v;
          }

          // 解析数值对 (词+数字)
          const valReg = /([^\d\s,，\n\r:：\t①②③【】]{1,12})[\s:：\t]*?(\d{1,3})(?!\d)/g;
          while ((m = valReg.exec(cleanText)) !== null) {
              let name = m[1].trim().replace(/[①②③]/g,'');
              let val = parseInt(m[2]);
              if (val < 1 || val > 100) continue;  // 排除乱码数字
              if (name.length < 2) continue;

              // 1. 中文属性名
              if (attrMapCN[name]) { parsed.attrs[attrMapCN[name]] = val; continue; }
              // 2. 英文属性名
              if (attrEN.includes(name.toUpperCase())) { parsed.attrs[name.toUpperCase()] = val; continue; }
              // 3. 精确匹配技能
              if (eng.BaseSkills[name] !== undefined) { parsed.skills[name] = val; continue; }
              // 4. 别名匹配
              let aliasHit = false;
              for (const key of allSkillKeys) {
                  const def = eng.BaseSkills[key];
                  if (def.aliases && def.aliases.some(a => a.replace(/[①②③：:]/g,'').trim() === name)) {
                      parsed.skills[key] = val; aliasHit = true; break;
                  }
              }
              if (aliasHit) continue;
              // 5. 模糊包含匹配
              let fuzzyHit = false;
              for (const key of allSkillKeys) {
                  if ((key.includes(name) && name.length >= 2) || (name.includes(key) && key.length >= 3)) {
                      parsed.skills[key] = val; fuzzyHit = true; break;
                  }
              }
              if (fuzzyHit) continue;
              // 6. 未知技能 → 直接存入
              if (name.length >= 2) parsed.skills[name] = val;
          }

          if (!Object.keys(parsed.attrs).length && !Object.keys(parsed.skills).length) {
              notify("❌ 未能识别数据，请检查格式。\n\n支持：\n· .st 力量50 体质60...\n· STR:50 CON:60...\n· 侦查:75 聆听:60...", "danger");
              return;
          }
          importPreview.value = parsed;
      };

      const confirmImport = () => {
          const parsed = importPreview.value;
          if (!parsed) return;
          const eng = (typeof CoCEngine !== "undefined" ? CoCEngine : null);
          // 用导入的属性+当前属性作为基础来计算技能基础值
          const baseAttrs = Object.assign({}, draftChar.attrs, parsed.attrs);
          const dummyChar = { attrs: baseAttrs, skills: {} };

          // 写入属性
          Object.assign(draftChar.attrs, parsed.attrs);
          // 写入信息
          if (parsed.info.name) draftChar.name = parsed.info.name;
          if (parsed.info.age) draftChar.age = parseInt(parsed.info.age) || draftChar.age;

          // 关键：技能导入用"最终值 - 基础值 = occ加点"，确保 getSkillTotal 计算正确
          draftChar.skillAllocations = {};
          for (const [skillName, finalVal] of Object.entries(parsed.skills)) {
              if (eng.isVisibleSkillName && !eng.isVisibleSkillName(skillName)) continue;
              const baseVal = eng.getSkillValue(dummyChar, skillName);
              const delta = Math.max(0, finalVal - baseVal);
              if (delta > 0) draftChar.skillAllocations[skillName] = { occ: delta, per: 0 };
          }
          draftChar.derived = eng.calculateDerived(draftChar.attrs, draftChar.age);
          importPreview.value = null;
          showSTImport.value = false;
          draftChar.stImportText = "";
          renderRadarChart();
      };

      const cancelImport = () => { importPreview.value = null; };

    const resetDraftChar = () => {
        draftChar.name = "";
        draftChar.player = "";
        draftChar.job = null;
        draftChar.skillAllocations = {};
        draftChar.expPackage = null;
        draftChar.sanPenalty = 0;
        for (let k in draftChar.attrs) draftChar.attrs[k] = 0;
        for (let k in draftChar.attrModifiers) draftChar.attrModifiers[k] = 0;
        draftChar.derived = { hp: 0, maxHp: 0, mp: 0, san: 0, db: "0", build: 0, mov: 0 };
    };

    const resolveOccupation = (jobLike) => {
        if (!jobLike || !Engine.Occupations) return jobLike;
        const name = typeof jobLike === 'string' ? jobLike : jobLike.name;
        return Engine.Occupations.find((j) => j.name === name) || jobLike;
    };

    const resolveCreatorReturn = () => {
        const ret = gameState.ui?.creatorReturn;
        if (ret && ret.screen === 'story') {
            gameState.ui.creatorReturn = null;
            gameState.ui.openStoryTab = ret.tab || 'character';
            State.switchScreen('story');
            return true;
        }
        return false;
    };

    const openStoryCharacterTab = () => {
        if (resolveCreatorReturn()) return;
        gameState.ui.openStoryTab = 'character';
        State.switchScreen('story');
    };


    const tryStartPendingScenario = async (pendingId) => {
        if (!pendingId) return false;
        const ok = await startScenarioById(pendingId);
        if (!ok) return false;
        if (gameState.scenarioRunner) gameState.scenarioRunner.pendingScenarioId = null;
        gameState.ui.openStoryTab = 'chat';
        return true;
    };

    const commitPresetToRoster = async (preset) => {
        const derived = Engine.calculateDerived(preset.attrs, preset.age);
        // calculateDerived now includes maxHp/maxSan (AUDITFIX: Paradox 3)
        // Defensive fallback removed — canonical source in attributes.mjs
        derived.hp = derived.maxHp;
        const job = resolveOccupation(preset.job);
        const investigatorName = (draftChar.name || '').trim() || preset.name;
        gameState.roster.push(createInvestigatorRecord({
            name: investigatorName,
            jobName: job ? job.name : (preset.job ? preset.job.name : '无业'),
            hp: derived.maxHp,
            sanity: derived.san,
            attrs: JSON.parse(JSON.stringify(preset.attrs)),
            derived: JSON.parse(JSON.stringify(derived)),
            skills: { ...preset.skillPts },
            backstory: {
                description: preset.desc || '',
                ideology: '', significantPeople: '', meaningfulLocations: '',
                treasuredPossessions: '', traits: '', injuries: '', phobias: '', encounters: ''
            },
            expName: '无',
            isActive: gameState.roster.length === 0,
            equipment: { head: null, acc1: null, acc2: null, hands: null, feet: null, weapon: null }
        }));
        const lastActiveIdx = gameState.roster.reduce((acc, c, i) => (c && c.isActive ? i : acc), -1);
        gameState.selectedCharIndex = Math.max(0, lastActiveIdx);
        if (State.clampSelectedCharIndex) State.clampSelectedCharIndex(gameState);
        gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: `调查员【${investigatorName}】已登入。` });
        resetDraftChar();
        if (radarChartInstance) { radarChartInstance.destroy(); radarChartInstance = null; }
        notify(`✅ ${investigatorName} 已就绪！可直接开始冒险。`, 'success');
        const pendingScenarioId = gameState.scenarioRunner && gameState.scenarioRunner.pendingScenarioId;
        if (pendingScenarioId) {
            if (await tryStartPendingScenario(pendingScenarioId)) {
                State.switchScreen('story');
                if (State.saveGame) {
                    const ok = await State.saveGame('auto', '自动存档');
                    if (!ok) notify('预置调查员已创建，但自动存档写入失败，请手动保存。', 'warning');
                }
                return;
            }
            notify('剧本加载失败，请从本地剧本模式重新开始。', 'danger');
        }
        openStoryCharacterTab();
        if (State.saveGame) {
            const ok = await State.saveGame('auto', '自动存档');
            if (!ok) notify('预置调查员已创建，但自动存档写入失败，请手动保存。', 'warning');
        }
    };

    applyPreset = async (preset) => {
        if (!preset) return;
        await commitPresetToRoster(preset);
    };

      const saveDraftCharacter = async () => {
        if (!isPointAllocationComplete.value) {
            notify(`请分配完所有技能点后再登记（剩余：本职 ${pointStats.value.occRemain}，兴趣 ${pointStats.value.perRemain}）。`, 'warning');
            return;
        }
        let finalSkills = {};
        for (let s of dynamicSkillNames.value) finalSkills[s] = getSkillTotal(s);
        const derivedData = JSON.parse(JSON.stringify(draftChar.derived));
        // calculateDerived now provides maxHp/maxSan — defensive fallback no longer needed
        derivedData.hp = derivedData.maxHp;
        
        gameState.roster.push(createInvestigatorRecord({
            name: draftChar.name,
            jobName: draftChar.job ? draftChar.job.name : '无业',
            hp: derivedData.maxHp,
            sanity: draftChar.derived.san,
            attrs: JSON.parse(JSON.stringify(draftChar.attrs)),
            derived: derivedData,
            skills: finalSkills,
            backstory: JSON.parse(JSON.stringify(draftChar.backstory)),
            expName: draftChar.expPackage ? draftChar.expPackage.name : '无',
            isActive: gameState.roster.length === 0,
            equipment: { head: null, acc1: null, acc2: null, hands: null, feet: null, weapon: null }
        }));
        gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: `调查员【${draftChar.name}】已登入。` });
        const lastActiveIdx = gameState.roster.reduce((acc, c, i) => (c && c.isActive ? i : acc), -1);
        gameState.selectedCharIndex = Math.max(0, lastActiveIdx);
        if (State.clampSelectedCharIndex) State.clampSelectedCharIndex(gameState);
        
        resetDraftChar();
        if (radarChartInstance) { radarChartInstance.destroy(); radarChartInstance = null; }
        activeCreatorTab.value = 'stats';
        // If a scenario was pending, start it before switching to story
        const pendingId = gameState.scenarioRunner && gameState.scenarioRunner.pendingScenarioId;
        if (pendingId) {
            if (await tryStartPendingScenario(pendingId)) {
                gameState.ui.creatorReturn = null;
                State.switchScreen('story');
                if (State.saveGame) {
                    const ok = await State.saveGame('auto', '自动存档');
                    if (!ok) notify('调查员已登记，但自动存档写入失败，请手动保存。', 'warning');
                }
                return;
            }
        }
        openStoryCharacterTab();
        if (State.saveGame) {
            const ok = await State.saveGame('auto', '自动存档');
            if (!ok) notify('调查员已登记，但自动存档写入失败，请手动保存。', 'warning');
        }
    };

    const prepareNewInvestigator = () => {
        resetDraftChar();
        activeCreatorTab.value = 'stats';
        if (radarChartInstance) { radarChartInstance.destroy(); radarChartInstance = null; }
    };

    const goBack = async () => {
        if (resolveCreatorReturn()) return;
        // Story character sheet vs lobby roster — never use legacy 'character' screen id
        // If a scenario was pending, start it before switching
        const pendingId = gameState.scenarioRunner && gameState.scenarioRunner.pendingScenarioId;
        if (pendingId) {
            if (await tryStartPendingScenario(pendingId)) {
                State.switchScreen('story');
                return;
            }
            // Keep pendingScenarioId so the player can retry after fixing roster/setup.
        }
        if (gameState.roster.length > 0) {
            openStoryCharacterTab();
        } else {
            State.switchScreen('roster');
        }
    };

    return { 
        availableJobs, availableExperiences, dynamicSkillNames, pointStats, isPointAllocationComplete,
        getSkillTotal, addSkillPoint, startAutoAdd, stopAutoAdd, removeSkillPoint, getSkillOcc, getSkillPer, 
        applyExperience, isUnlockedSkill, isClassSkill, rollAllStats, saveDraftCharacter,
        showSTImport, importSTData, confirmImport, cancelImport, importPreview, goBack,
        handleOccupationChange,
        getAttrEvaluation: Engine.getAttrEvaluation,
        CHARACTER_PRESETS, applyPreset, prepareNewInvestigator,
        chartUnavailable
    };
})((function () {
    try {
        const Acc = (typeof window !== 'undefined' && window.CoCStateAccessor) || CoCStateAccessor;
        return Acc.getState();
    } catch (_e) {
        return null;
    }
})(), (typeof window !== 'undefined' && window.CoCEngine) || CoCEngine, window.Vue);