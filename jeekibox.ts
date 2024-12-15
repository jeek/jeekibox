export async function Do(
  ns,
  command,
  ...args
) {
  return await DoMore(ns, 1, command, ...args);
}

export async function DoMore(
  ns,
  threads,
  command,
  ...args
) {
  let commandy = command.replace("await ", "").replace("ns.", "");
  let memory = 1.6 + ns.getFunctionRamCost(commandy);
  let pid = ns.run(
    ns.getScriptName(),
    { ramOverride: memory, threads: threads },
    "--ramOverride",
    memory,
    "--do",
    JSON.stringify([commandy, JSON.stringify(args)])
  );
  let z = -1;
  while (0 == pid) {
    z += 1;
    await ns.asleep(z);
    pid = ns.run(
      ns.getScriptName(),
      { ramOverride: memory, threads: threads },
      "--ramOverride",
      memory,
      "--do",
      JSON.stringify([commandy, JSON.stringify(args)])
    );
  }
  await ns.getPortHandle(pid).nextWrite();
  let answer = ns.readPort(pid);
  return answer;
}

export class Shotgun {
  constructor(ns, buffer) {
    this.buffer = buffer;
    this.sourceServers = [];
  }
  async buyProgs(ns) {
    if (await Do(ns, "ns.singularity.purchaseTor")) {
      for (let i of ["BruteSSH.exe", "FTPCrack.exe", "relaySMTP.exe", "HTTPWorm.exe", "SQLInject.exe", "Formulas.exe"]) {
        if ((await Do(ns, "ns.singularity.getDarkwebProgramCost", i)) < await Do(ns, "ns.getServerMoneyAvailable", "home")) {
          if (!await Do(ns, "ns.fileExists", i[0], "home")) {
            await Do(ns, "ns.singularity.purchaseProgram", i);
          }
        }
      }
    }
  }

  async getServers(ns) {
    let servers = ["home"];
    let i = 0;
    while (i < servers.length) {
      for (let server of await Do(ns, "ns.scan", servers[i])) {
        if (!servers.includes(server)) {
          servers.push(server);
        }
      }
      i += 1;
    }
    return servers;
  }

  async hackEmAll(ns, servers) {
    let procs = [];
    let z = 0;
    for (let script of [
      ["BruteSSH.exe", "brutessh"],
      ["FTPCrack.exe", "ftpcrack"],
      ["HTTPWorm.exe", "httpworm"],
      ["SQLInject.exe", "sqlinject"],
      ["relaySMTP.exe", "relaysmtp"]]) {
      if (await Do(ns, "ns.fileExists", script[0], "home")) {
        servers.map(server => procs.push(Do(ns, "ns." + script[1], server)));
        z += 1;
      }
    }
    await Promise.all(procs);
    procs = [];
    for (let server of servers) {
      if (z >= (await Do(ns, "ns.getServer", server))["numOpenPortsRequired"]) {
        procs.push(Do(ns, "ns.nuke", server));
      }
    }
    await Promise.all(procs);
  }

  async pewpew(ns) {
    let pid = 0;
    while (!(await Do(ns, "ns.getServer", "joesguns")).hasAdminRights) {
      await ns.asleep(1000);
    }
    while (true) {
      let mythreads = Math.floor((await Do(ns, "ns.getServerMaxRam", "home") / 10 / 1.75));
      if (mythreads > 0) {
        if ((await Do(ns, "ns.getServerMinSecurityLevel", "joesguns")) < (await Do(ns, "ns.getServerSecurityLevel", "joesguns"))) {
          pid = ns.run(ns.getScriptName(), { "threads": mythreads, "ramOverride": 1.75, "preventDuplicates": true }, "--target", "joesguns", "--additionalMsec", 0, "--weaken");
          while (await Do(ns, "ns.isRunning", pid)) {
            await ns.asleep(0);
          }
        }
        pid = ns.run(ns.getScriptName(), { "threads": mythreads, "ramOverride": 1.75, "preventDuplicates": true }, "--target", "joesguns", "--additionalMsec", 0, "--grow");
        while (await Do(ns, "ns.isRunning", pid)) {
          await ns.asleep(0);
        }
        if (pid == 0) {
          await ns.asleep(0);
        }
      } else {
        await ns.asleep(1000);
      }
    }
  }
  async pickTarget(ns, servers) {
    let player = await Do(ns, "ns.getPlayer");
    if (!await Do(ns, "ns.fileExists", "Formulas.exe", "home")) {
      let answer = "foodnstuff";
      if (player.skills.hacking <= 5) {
        answer = "foodnstuff";
      }
      if (player.skills.hacking > 5 && (await Do(ns, "ns.hasRootAccess", "joesguns"))) {
        answer = "joesguns";
      }
      if (player.skills.hacking > 500 && player.skills.hacking <= 1000 && (await Do(ns, "ns.hasRootAccess", "phantasy"))) {
        answer = "phantasy";
      }
      if (player.skills.hacking > 1000 && (await Do(ns, "ns.hasRootAccess", "rho-construction"))) {
        answer = "rho-construction";
      }
      return answer;
    }
    let targetServers = (await Promise.all(servers.map(x => Do(ns, "ns.getServer", x))))
      //      .filter(x => x["requiredHackingSkill"] * 1.5 <= player["skills"]["hacking"] || x["requiredHackingSkill"] == 1)
      .filter(x => x["moneyMax"] > 0)
      .filter(x => x["openPortCount"] >= x["numOpenPortsRequired"])
      //      .filter(x => x["serverGrowth"] > 1)
      .filter(x => x["hasAdminRights"] == true)
      .sort((a, b) => a["moneyMax"] - b["moneyMax"]);
    if (targetServers.length == 0) {
      return "n00dles";
    }
    let i = 0;
    while (i < targetServers.length) {
      targetServers[i]["weakenTime"] = ns.formulas.hacking.weakenTime(Object.assign(targetServers[i], { "hackDifficulty": targetServers[i]["minDifficulty"] }), player);
      targetServers[i]["hackChance"] = ns.formulas.hacking.hackChance(Object.assign(targetServers[i], { "hackDifficulty": targetServers[i]["minDifficulty"] }), player);
      i += 1;
    }
    targetServers = targetServers
      .filter(x => x["hackChance"] > 0)
      .filter(x => ns.formulas.hacking.hackPercent(Object.assign(x, { "hackDifficulty": x["minDifficulty"] }), player) > 0)
      .sort((b, a) => a["moneyMax"] / a["weakenTime"] * a["hackChance"] * (1 + Math.pow(a["serverGrowth"], .75)) - b["moneyMax"] / b["weakenTime"] * b["hackChance"] * (1 + Math.pow(b["serverGrowth"], .75)));
    return targetServers.length > 0 ? targetServers[0]["hostname"] : "n00dles";
  }

  async prepServer(ns, targetServer, startHack, disp) {
    let pids = [];
    // Prep
    disp("Prepping " + targetServer);
    while ((await Do(ns, "ns.getServer", targetServer)).hackDifficulty > (await Do(ns, "ns.getServer", targetServer)).minDifficulty ||
      (await Do(ns, "ns.getServer", targetServer)).moneyMax > (await Do(ns, "ns.getServer", targetServer)).moneyAvailable) {
      let weakenNeeded = Math.ceil(((await Do(ns, "ns.getServer", targetServer)).hackDifficulty - (await Do(ns, "ns.getServer", targetServer)).minDifficulty) / .015);
      weakenNeeded = Math.max(0, weakenNeeded);

      let growNeeded = 1;
      if (await Do(ns, "ns.fileExists", "Formulas.exe", "home")) {
        growNeeded = 1 + ((await Do(ns, "ns.getServer", targetServer)).moneyMax - (await Do(ns, "ns.getServer", targetServer)).moneyAvailable) > 0 ? ns.formulas.hacking.growThreads(await Do(ns, "ns.getServer", targetServer), await Do(ns, "ns.getPlayer"), (await Do(ns, "ns.getServer", targetServer)).moneyMax, 1) : 0;
      } else {
        /////ns.tprint("1111");
        growNeeded = Math.ceil((await Do(ns, "ns.growthAnalyze", targetServer, (await Do(ns, "ns.getServerMaxMoney", targetServer)) / Math.max(1, (await Do(ns, "ns.getServerMoneyAvailable", targetServer))))));
      }

      for (let source of this.sourceServers) {
        let freeMem = (await Do(ns, "ns.getServer", source["hostname"])).maxRam - (await Do(ns, "ns.getServer", source["hostname"])).ramUsed;
        if (source["hostname"] == "home") {
          freeMem -= this.buffer;
        }
        if (Math.floor(freeMem / 1.75) > 0) {
          if (weakenNeeded > 0) {
            pids.push(await Do(ns, "ns.exec", ns.getScriptName(), source["hostname"], { "threads": Math.min(weakenNeeded, Math.floor(freeMem / 1.75)), "ramOverride": 1.75 }, "--weaken", "--target", targetServer));
            weakenNeeded -= Math.min(weakenNeeded, Math.floor(freeMem / 1.75));
          }
        }
        weakenNeeded = Math.max(0, weakenNeeded);
        freeMem = (await Do(ns, "ns.getServer", source["hostname"])).maxRam - (await Do(ns, "ns.getServer", source["hostname"])).ramUsed;
        if (source["hostname"] == "home") {
          freeMem -= this.buffer;
        }
        if (Math.floor(freeMem / 1.75) > 0) {
          if (growNeeded > 0) {
            let temp = Math.min(growNeeded, Math.floor(freeMem / 1.75));
            //ns.tprint("2222");
            let temp2 = await Do(ns, "ns.growthAnalyzeSecurity", temp, targetServer, 1);
            pids.push(await Do(ns, "ns.exec", ns.getScriptName(), source["hostname"], { "threads": Math.min(growNeeded, Math.floor(freeMem / 1.75)), "ramOverride": 1.75 }, "--grow", "--target", targetServer));
            growNeeded -= Math.min(growNeeded, Math.floor(freeMem / 1.75));
            weakenNeeded += 1 + Math.ceil(temp2 / .015);
          }
        }
        freeMem = (await Do(ns, "ns.getServer", source["hostname"])).maxRam - (await Do(ns, "ns.getServer", source["hostname"])).ramUsed;
        if (Math.floor(freeMem / 1.75) > 0) {
          //          if (weakenNeeded >= 1 || (source["hostname"] == this.sourceServers[this.sourceServers.length-1]["hostname"] && weakenNeeded > 0)) {
          if (weakenNeeded > 0) {
            pids.push(await Do(ns, "ns.exec", ns.getScriptName(), source["hostname"], { "threads": Math.min(weakenNeeded, Math.floor(freeMem / 1.75)), "ramOverride": 1.75 }, "--weaken", "--target", targetServer));
            weakenNeeded -= Math.min(weakenNeeded, Math.floor(freeMem / 1.75));
          }
        }
        weakenNeeded = Math.max(0, weakenNeeded);
      }

      if (pids.length == 0) {
        await ns.asleep(1000);
      }
      //ns.tprint(weakenNeeded, " ", growNeeded, " ", pids);
      //pids = pids.filter(x => x != 0);
      while (pids.length > 0 && ((await Do(ns, "ns.getServer", targetServer)).hackDifficulty > (await Do(ns, "ns.getServer", targetServer)).minDifficulty ||
      (await Do(ns, "ns.getServer", targetServer)).moneyMax > (await Do(ns, "ns.getServer", targetServer)).moneyAvailable)) {
        if (await Do(ns, "ns.isRunning", pids[0])) {
          await ns.asleep(1000);
        } else {
          pids.shift();
          await ns.asleep(10);
        }
      }
      pids.map(x => Do(ns, "ns.kill", x));
      await ns.asleep(10);
    }
    disp("Prepped " + targetServer);
  }

  async pickPlanHGW(ns, targetServer) {
    let totalRam = this.sourceServers.map(x => x["maxRam"] - x["ramUsed"]).reduce((a, b) => a + b);
    this.sourceServers = (await Promise.all(this.sourceServers.map(x => x['hostname']).map(x => Do(ns, "ns.getServer", x)))).sort((b, a) => a["maxRam"] - a["ramUsed"] - (b["maxRam"] - b["ramUsed"]));
    let highestRam = [this.sourceServers[this.sourceServers.length == 1 ? 0 : 0]].map(x => x["maxRam"] - x["ramUsed"] - (x["hostname"] == "home" ? this.buffer : 0)).reduce((a, b) => Math.max(a, b));
    let hasFormulas = (await Do(ns, "ns.fileExists", "Formulas.exe", "home"));
    let wa = await Do(ns, "ns.weakenAnalyze", 1);
    let serverData = await Do(ns, "ns.getServer", targetServer);
    let hackCalc = hasFormulas ? (ns.formulas.hacking.hackPercent(serverData, await Do(ns, "ns.getPlayer"))) : (await Do(ns, "ns.hackAnalyze", targetServer));
    let moneyMax = (await Do(ns, "ns.getServer", targetServer)).moneyMax;
    let player = await Do(ns, "ns.getPlayer");
    let plans = [];
    let hackThreads = 1;
    let possibles = [.1, .5, 1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 96, 97, 98, 99];
    let iz = 0;
    let ratio = this.sourceServers.map(x => [x['maxRam'] / (1 + (x['cpuCores'] - 1) / 16), x['maxRam']]).reduce((a, b) => [a[0] + b[0], a[1] + b[1]]);
    ratio = ratio[0] / ratio[1];
    while (iz < possibles.length) {
      let possible = possibles[iz];
      let lowerT = 1;
      let upperT = 1;
      while (hackThreads * hackCalc < possible * .01) {
        upperT *= 2;
        hackThreads = Math.floor((lowerT + upperT) / 2);
      }
      while (lowerT != upperT) {
        if (hackThreads * hackCalc < possible * .01) {
          lowerT = Math.ceil((lowerT + upperT) / 2);
        } else {
          upperT = Math.floor((lowerT + upperT) / 2);
        }
        hackThreads = Math.floor((lowerT + upperT) / 2);
      }
      if (!hasFormulas) {
        hackThreads = Math.ceil(hackThreads / 2);
      }
      hackThreads = Math.max(hackThreads, 1);
      let moneyAvailable = moneyMax * (1 - hackThreads * hackCalc);
      let growThreads = 1;
      if (hasFormulas) {
        growThreads = 1 + 2 * Math.ceil(ns.formulas.hacking.growThreads(Object.assign(serverData, { "moneyAvailable": moneyAvailable, "hackDifficulty": Math.ceil(serverData.minDifficulty + .002 * hackThreads) }), player, (serverData).moneyMax, 1)) - Math.ceil(ns.formulas.hacking.growThreads(Object.assign(serverData, { "moneyAvailable": moneyAvailable }), player, (serverData).moneyMax, 1));
      } else {
        growThreads = 1 + Math.ceil((await Do(ns, "ns.growthAnalyze", targetServer, 1 / (1 - Math.min(.999, (hackThreads * await Do(ns, "ns.hackAnalyze", targetServer)))))));
      }
      let w2Threads = Math.ceil(hackThreads * .002 / wa + growThreads * .004 / wa);
      if (hasFormulas) {
        plans.push([possible, hackThreads, growThreads, w2Threads, moneyMax * .01 * possible, Math.min(Math.floor(400000/3), Math.floor(highestRam / (1.75 * (hackThreads + growThreads * ratio + w2Threads * ratio))))]);
      } else {
        plans.push([possible, hackThreads, growThreads, w2Threads, moneyMax * .01 * possible, Math.min(4 * Math.ceil((await Do(ns, "ns.getWeakenTime", targetServer)) / 1000), Math.floor(highestRam / (1.75 * (hackThreads + growThreads * ratio + w2Threads * ratio))))]);
      }
      if (Math.max(plans[plans.length - 1].slice(1, 4)) * 1.75 > highestRam) {
        iz = 1000;
      }
      iz += 1;
    }
    plans = plans
      .filter(x => x[1] * 1.7 < highestRam)
      .filter(x => x[2] * 1.75 < highestRam)
      .filter(x => x[3] * 1.75 < highestRam)
      .filter(x => x[5] > 0)
      .sort((b, a) => a[4] * a[5] - b[4] * b[5]);
    if (plans.length == 0) {
      return plans;
    }
    let lesser = Math.max(.1, plans[0][0] - 5);
    let morer = Math.min(99.9, plans[0][0] + 5);
    hackThreads = 1;
    possibles = [lesser];
    while (possibles[possibles.length - 1] < morer) {
      possibles.push(possibles[possibles.length - 1] + .1);
    }
    iz = 0;
    while (iz < possibles.length) {
      let possible = possibles[iz];
      let lowerT = 1;
      let upperT = 1;
      while (hackThreads * hackCalc < possible * .01) {
        upperT *= 2;
        hackThreads = Math.floor((lowerT + upperT) / 2);
      }
      while (lowerT != upperT) {
        if (hackThreads * hackCalc < possible * .01) {
          lowerT = Math.ceil((lowerT + upperT) / 2);
        } else {
          upperT = Math.floor((lowerT + upperT) / 2);
        }
        hackThreads = Math.floor((lowerT + upperT) / 2);
      }
      hackThreads = Math.max(hackThreads, 1);
      let moneyAvailable = moneyMax * (1 - hackThreads * hackCalc);
      let growThreads = 1;
      if (hasFormulas) {
        growThreads = 1 + 2 * Math.ceil(ns.formulas.hacking.growThreads(Object.assign(serverData, { "moneyAvailable": moneyAvailable, "hackDifficulty": Math.ceil(serverData.minDifficulty + .002 * hackThreads) }), player, (serverData).moneyMax, 1)) - Math.ceil(ns.formulas.hacking.growThreads(Object.assign(serverData, { "moneyAvailable": moneyAvailable }), player, (serverData).moneyMax, 1));
      } else {
        ////ns.tprint("6666");
        growThreads = Math.ceil((await Do(ns, "ns.growthAnalyze", targetServer, Math.ceil(serverData["moneyMax"] / (serverData["moneyMax"] - Math.min(.99999999, serverData["moneyMax"] * (hackThreads * await Do(ns, "ns.hackAnalyze", targetServer))))))));
      }
      let w2Threads = Math.ceil(hackThreads * .002 / wa + growThreads * .004 / wa);
      if (hasFormulas) {
        plans.push([possible, hackThreads, growThreads, w2Threads, moneyMax * .01 * possible, Math.min(Math.floor(400000/3), Math.floor(highestRam / (1.75 * (hackThreads + growThreads * ratio + w2Threads * ratio))))]);
      } else {
        plans.push([possible, hackThreads, growThreads, w2Threads, moneyMax * .01 * possible, Math.min(3 * Math.ceil((await Do(ns, "ns.getWeakenTime", targetServer)) / 1000), Math.floor(highestRam / (1.75 * (hackThreads + growThreads * ratio + w2Threads * ratio))))]);
      }
      if (Math.max(plans[plans.length - 1].slice(1, 4)) * 1.75 > highestRam) {
        iz = 1000;
      }
      iz += 1;
    }
    plans = plans
      .filter(x => x[1] > 0)
      .filter(x => x[2] > 0)
      .filter(x => x[3] > 0)
      .filter(x => x[1] * 1.7 < highestRam)
      .filter(x => x[2] * 1.75 < highestRam)
      .filter(x => x[3] * 1.75 < highestRam)
      .filter(x => x[5] > 0)
      .sort((b, a) => a[4] * a[5] - b[4] * b[5]);
    return plans;
  }


  async shotgunHGW(ns, targetServer, plans, startHack, disp) {
    disp("Generating...");
    let serverData = await Do(ns, "ns.getServer", targetServer);
    let player = await Do(ns, "ns.getPlayer");
    let hasFormulas = (await Do(ns, "ns.fileExists", "Formulas.exe", "home"));
    let gt = hasFormulas ? (ns.formulas.hacking.weakenTime(serverData, player) - ns.formulas.hacking.growTime(serverData, player)) : ((await Do(ns, "ns.getWeakenTime", targetServer)) - (await Do(ns, "ns.getGrowTime", targetServer)));
    let ht = hasFormulas ? (ns.formulas.hacking.weakenTime(serverData, player) - ns.formulas.hacking.hackTime(serverData, player)) : ((await Do(ns, "ns.getWeakenTime", targetServer)) - (await Do(ns, "ns.getHackTime", targetServer)));
    let wt = hasFormulas ? (performance.now() + ns.formulas.hacking.weakenTime(serverData, player)) : (performance.now() + await Do(ns, "ns.getWeakenTime", targetServer));
    let freeRam = {};
    if (plans.length == 0) {
      return [];
    }
    let tiniest = Math.min([1.7 * plans[0][1], 1.75 * plans[0][2], 1.75 * plans[0][3]]);
    let pids = [];
    let reduced = ((await Do(ns, "ns.getServer", targetServer)).moneyMax) - ((await Do(ns, "ns.getServer", targetServer)).moneyMax) * (plans[0][1] * ns.formulas.hacking.hackPercent(await Do(ns, "ns.getServer", targetServer), await Do(ns, "ns.getPlayer")));
    ns.tprint("?? ", reduced);
    if (reduced < 0) {
      return [];
    }
    plans[0][1] += 1;
    plans[0][2] += 1;
    ns.tprint(plans[0]);
    while (startHack == (await Do(ns, "ns.getPlayer")).skills.hacking) {
      let done = false;
      for (let server of this.sourceServers) {
        freeRam[server['hostname']] = server.maxRam - (await Do(ns, "ns.getServerUsedRam", server['hostname']));
        if (freeRam[server['hostname']] < tiniest) {
          delete freeRam[server['hostname']];
        }
      }
      let jobQueue = [];
      let zzz = 0;
      while (!done) {
        zzz += 1;
        let possible = Object.keys(freeRam).map(x => [x, freeRam[x]]).filter(x => x[1] > 1.7 * plans[0][1]).sort((a, b) => a[1] - b[1]);
        if (possible.length > 0) {
          jobQueue.push([possible[0][0], "--hack", 1.7, plans[0][1], ht, targetServer]);
          freeRam[possible[0][0]] -= 1.7 * plans[0][1];
          if (freeRam[possible[0][0]] < tiniest) {
            delete freeRam[possible[0][0]];
          }
          possible = Object.keys(freeRam).map(x => [x, freeRam[x], ns.formulas.hacking.growThreads(Object.assign(serverData, { "moneyAvailable": reduced, "hackDifficulty": Math.ceil(serverData.minDifficulty + .002 * plans[0][1]) }), player, serverData.moneyMax, this.sourceServers.filter(y => y.hostname == x)[0].cpuCores)]).filter(x => x[1] > 1.75 * plans[0][2]).sort((a, b) => a[1] - b[1]);
          if (possible.length > 0) {
            //jobQueue.push([possible[0][0], "--grow", 1.75, possible[0][2], gt, targetServer]);
            //freeRam[possible[0][0]] -= 1.75 * possible[0][2];
            jobQueue.push([possible[0][0], "--grow", 1.75, plans[0][2], gt, targetServer]);
            freeRam[possible[0][0]] -= 1.75 * plans[0][2];
            if (freeRam[possible[0][0]] < tiniest) {
              delete freeRam[possible[0][0]];
            }
            possible = Object.keys(freeRam).map(x => [x, freeRam[x]]).filter(x => x[1] > 1.75 * plans[0][3] / (1 + (this.sourceServers.filter(y => y["hostname"] == x[0])[0].cpuCores - 1) / 16)).sort((a, b) => a[1] - b[1]);
            if (possible.length > 0) {
              let cores = this.sourceServers.filter(y => y["hostname"] == possible[0][0])[0].cpuCores;
              cores -= 1
              cores = Math.max(1, cores);
              //jobQueue.push([possible[0][0], "--weaken", 1.75, Math.ceil(plans[0][3] / (1 + (cores - 1) / 16)), 0, targetServer]);
              //freeRam[possible[0][0]] -= 1.75 * (Math.ceil(plans[0][3] / (1 + (cores - 1) / 16)));
              jobQueue.push([possible[0][0], "--weaken", 1.75, plans[0][3], 0, targetServer]);
              freeRam[possible[0][0]] -= 1.75 * plans[0][3];
            } else {
              done = true;
            }
          } else {
            done = true;
          }
        } else {
          done = true;
        }
        if (jobQueue.length > 400000) {
          done = true;
        }
      }
      while (jobQueue.length % 3 != 0) {
        jobQueue.pop();
      }

      disp("Queuing jobs")
      //      for (let x of jobQueue) {
      let checker = ns.run(ns.getScriptName(), { "threads": 1, "ramOverride": 2.9 }, "--exec", JSON.stringify(jobQueue));
      //        pids.push(await Do(ns, "ns.exec", ns.getScriptName(), x[0], { "threads": x[3], "ramOverride": x[2] }, "--target", targetServer, "--additionalMsec", x[4], x[1]));
      //      }
      //      ns.print(pids);
      disp("Jobs queued")
      //while (pids.length % 3 != 0) {
      //        await Do(ns, "ns.kill", pids[pids.length - 1]);
      //        pids.pop();
      //}
      //      await ns.asleep(1000 + ns.formulas.hacking.weakenTime(serverData, player));
      //      return [];
      for (let server of this.sourceServers) {
        let threads = Math.floor(((await Do(ns, "ns.getServerMaxRam", server["hostname"])) - (await Do(ns, "ns.getServerUsedRam", server["hostname"])) - (server["hostname"] == "home" ? this.buffer : 0)) / 1.75);
        let wT = Math.floor(threads / 2);
        let gT = Math.ceil(threads / 2);
        if (gT > 0) {
          pids.push(await Do(ns, "ns.exec", ns.getScriptName(), server["hostname"], { "threads": gT, "ramOverride": 1.75 }, "--target", targetServer, "--additionalMsec", gt, "--grow"));
        }
        if (wT > 0) {
          pids.push(await Do(ns, "ns.exec", ns.getScriptName(), server["hostname"], { "threads": wT, "ramOverride": 1.75 }, "--target", targetServer, "--additionalMsec", 0, "--weaken"));
        }
      }
      while (ns.peek(checker) == "NULL PORT DATA") {
        await ns.asleep(0);
      }
      pids.unshift(ns.readPort(checker));
      return pids;
      //      return pids;
    }
    //return pids;
  }

  /** @param {NS} ns */
  async start(ns) {
    let disp = ns.toast;
    let resetInfo = await Do(ns, "ns.getResetInfo");
    let giveUp = false;
    while (true) {
      if (resetInfo.ownedSF.has(4) || resetInfo.currentNode == 4) {
        await this.buyProgs(ns);
      }
      let startHack = (await Do(ns, "ns.getPlayer")).skills.hacking;
      let servers = await this.getServers(ns);

      await this.hackEmAll(ns, servers);
      let i = 0;

      let player = await Do(ns, "ns.getPlayer");
      let targetServer = await this.pickTarget(ns, servers);

      // Copy self from home to all other servers
      await Promise.all(servers.filter(server => server != "home").map(server => Do(ns, "ns.scp", ns.getScriptName(), server, "home")));
      //servers = servers.filter(x => !x.includes("hacknet"));
      this.sourceServers = (await Promise.all(servers.map(server => Do(ns, "ns.getServer", server))))
        .map(server => server.hostname != "home" ? server : Object.assign(server, { "maxRam": server["maxRam"] - this.buffer }))
        .filter(server => server["purchasedByPlayer"] || (server["openPortCount"] >= server["numOpenPortsRequired"]))
        .filter(server => server["maxRam"] > 0);

      await this.prepServer(ns, targetServer, startHack, disp);
      startHack = (await Do(ns, "ns.getPlayer")).skills.hacking;
      let plans = await this.pickPlanHGW(ns, targetServer, disp);
      // No plans. Try again
      if (plans.length == 0) {
        targetServer = "foodnstuff";
        await this.prepServer(ns, targetServer, startHack, disp);
        plans = await this.pickPlanHGW(ns, targetServer, disp);
        if (plans.length == 0) {
          targetServer = "n00dles";
          await this.prepServer(ns, targetServer, startHack, disp);
          plans = await this.pickPlanHGW(ns, targetServer, disp);
          if (plans.length == 0) {
            giveUp = true;
          }
        }
      }
      if (plans.length > 0 && !giveUp) {
        // Do the thing
        let pidsy = await this.shotgunHGW(ns, targetServer, plans, startHack, disp);
        //        ns.tprint(pidsy);
        pidsy ??= [];
        pidsy = pidsy.filter(x => x != 0);
        if (pidsy.length > 0) {
          pidsy = pidsy.concat(await this.shotgunHGW(ns, targetServer, await this.pickPlanHGW(ns, targetServer, disp), startHack, disp));
        }
        while (pidsy.length > 0 && await Do(ns, "ns.isRunning", pidsy[pidsy.length - 1])) {
          await ns.asleep(1000);
        }
        while (pidsy.length > 0 && await Do(ns, "ns.isRunning", pidsy[0])) {
          await ns.asleep(1000);
        }
      }
      giveUp = false;
      await ns.asleep(1000);
    }
  }
}

//export async function hacky(ns) {
//  while (true) {
//let pid = await Do(ns, "ns.run", "shotgun.js", { "threads": 1, "ramOverride": 3.6, "preventDuplicates": true }, "--mhack");
//while (await Do(ns, "ns.isRunning", pid)) {
//      await ns.asleep(0);
//}
//await ns.asleep(0);
//}
//}

export async function main(ns) {
  //  ns.disableLog("disableLog");
  ns.disableLog("asleep");
  //  ns.disableLog("isRunning");
  // ns.disableLog("run");
  const args = ns.flags([
    ["ramOverride", 2.6],
    ["hack", false],
    ["weaken", false],
    ["grow", false],
    ["target", "home"],
    ["additionalMsec", 0],
    ["buffer", 20],
    ["exec", ""],
    ["do", ""],
    ["pewpew", false],
  ]);
  if (args["hack"] != false) {
    await ns["hack"](args["target"], { "additionalMsec": args["additionalMsec"] });
    return;
  }
  if (args["grow"] != false) {
    await ns["grow"](args["target"], { "additionalMsec": args["additionalMsec"] });
    return;
  }
  if (args["weaken"] != false) {
    await ns["weaken"](args["target"], { "additionalMsec": args["additionalMsec"] });
    return;
  }
  if (args["exec"] != "") {
    let pids = JSON.parse(args["exec"]).map(x => ns["exec"](ns.getScriptName(), x[0], { "threads": x[3], "ramOverride": x[2] }, "--target", x[5], "--additionalMsec", x[4], x[1]));
    ns.writePort(ns.pid, pids[pids.length - 1]);
    return;
  }
  let buffer = args["buffer"];
  if (args["do"] != "") {
    let doArgs = JSON.parse(args["do"]);
    let output = "UnDeFiNeDaF";
    try {
    output =
      (await doArgs[0].split(".").reduce((a, b) => a[b], ns)(
        ...JSON.parse(doArgs[1])
      )) ?? "UnDeFiNeDaF";
    } catch {

    }
    ns.atExit(() => ns.writePort(ns.pid, output));
    return;
  }

  if (args["pewpew"] != false) {
    (new Shotgun(ns, buffer)).pewpew(ns);
  } else {
    //   hacky(ns);
    Do(ns, "ns.exec", ns.getScriptName(), "home", { 'threads': 1, 'preventDuplicates': true }, "--pewpew");
    await ((new Shotgun(ns, buffer)).start(ns));
  }
  while (await ns.asleep(60000));
}
