async function main() {
    // turn off for release
    const PLAYTESTING = true;

    console.log("Started game!");

    const displayedText = document.getElementById("displayedText").children[0];
    const displayedImage = document.getElementById("displayedImage");
    const characterInfo = document.getElementById("characterInfo");
    const popup = document.getElementById("popup");
    const popupText = document.getElementById("popupText");
    const popupInput = document.getElementById("popupInput");
    const popupSubmit = document.getElementById("popupSubmit");
    const skipTextDisplay = document.getElementById("skipTextDisplay");
    const saveGame = document.getElementById("saveGame");
    const mainContent = document.getElementById("mainContent");

    if (!PLAYTESTING) {
        skipTextDisplay.style.display = "none";
    }

    // Initialize choices
    const choices = [1, 2, 3, 4, 5, 6].map((c) => document.getElementById("choice" + c));
    for (let i in choices) {
        choices[i].clickFn = null;
        choices[i].onclick = function(e) {
            this.clickFn();
        };
    }

    const choiceGrids = [
        [], // 0 choices
        ["37 / 7 / 49 / 23"], // 1 choice
        ["37 / 7 / 49 / 23", "49 / 7 / 61 / 23"], // 2 choices
        ["37 / 7 / 45 / 23", "45 / 7 / 53 / 23", "53 / 7 / 61 / 23"], // 3 choices
        ["37 / 7 / 49 / 15", "37 / 15 / 49 / 23", "49 / 7 / 61/ 15", "49 / 15 / 61 / 23"], // 4 choices
        ["37 / 7 / 45 / 15", "37 / 15 / 45 / 23", "45 / 7 / 53 / 15", "45 / 15 / 53 / 23", "53 / 10 / 61 / 20"], // 5 choices
        ["37 / 7 / 45 / 15", "37 / 15 / 45 / 23", "45 / 7 / 53 / 15", "45 / 15 / 53 / 23", "53 / 7 / 61 / 15", "53 / 15 / 61 / 23"], // 6 choices
    ];

    const fontSizes = [
        "",
        "2vw",
        "1.8vw",
        "1.5vw",
        "1.2vw",
        "1.2vw",
        "1.2vw"
    ];

    let setChoicesTo = function(choiceInfo) {
        if (choiceInfo.length % 3 !== 0) {
            throw new Error("Bad choice count");
        }

        let gridArea = choiceGrids[choiceInfo.length / 3];
        let fontSize = fontSizes[choiceInfo.length / 3];

        for (let i in choices) {
            choices[i].style.display = "none";
        }

        for (let i = 0; i < choiceInfo.length; i += 3) {
            let usedFontSize = undefined;
            if (choiceInfo[i + 1] !== "<default>") {
                usedFontSize = choiceInfo[i + 1];
            } else {
                usedFontSize = fontSize;
            }

            choices[i / 3].style.display = "flex";
            choices[i / 3].style.gridArea = gridArea[i / 3];
            choices[i / 3].style.fontSize = usedFontSize;

            choices[i / 3].innerText = choiceInfo[i];
            choices[i / 3].clickFn = choiceInfo[i + 2];
        }
    };

    let setDisplayedText = function(displayedTextValue) {
        displayPrintedText(displayedTextValue, false, true);
    };

    let openTextPopup = function(text, allowEmpty, fontSize="20px", height="8vh") {
        popupInput.value = "";
        popupText.innerText = text;
        popupSubmit.innerText = "Submit";
        popupText.style.fontSize = fontSize;
        popupInput.style.display = "block";
        popup.style.display = "block";
        popup.style.height = height;
        popupInput.style.display = "inline";
        document.documentElement.classList.add("darkened");
        saveGame.classList.add("darkened");
        skipTextDisplay.classList.add("darkened");
        mainContent.style.pointerEvents = "none";

        return new Promise(function(resolve) {
            popupSubmit.onclick = function(e) {
                if (popupInput.value !== "" || allowEmpty) {
                    popupText.innerText = "";
                    popup.style.display = "none";
                    popupInput.style.display = "none";
                    document.documentElement.classList.remove("darkened");
                    saveGame.classList.remove("darkened");
                    skipTextDisplay.classList.remove("darkened");
                    mainContent.style.pointerEvents = "auto";

                    resolve(popupInput.value);
                }
            };
        });
    };

    let openTextOnlyPopup = function(text, fontSize="20px", height="8vh") {
        popupText.innerText = text;
        popupSubmit.innerText = "Okay";
        popupText.style.fontSize = fontSize;
        popupInput.style.display = "none";
        popup.style.display = "block";
        popup.style.height = height;
        popupInput.style.display = "none";
        document.documentElement.classList.add("darkened");
        saveGame.classList.add("darkened");
        skipTextDisplay.classList.add("darkened");
        mainContent.style.pointerEvents = "none";

        return new Promise(function(resolve) {
            popupSubmit.onclick = function(e) {
                popupText.innerText = "";
                popup.style.display = "none";
                document.documentElement.classList.remove("darkened");
                saveGame.classList.remove("darkened");
                skipTextDisplay.classList.remove("darkened");
                mainContent.style.pointerEvents = "auto";

                resolve();
            };
        });
    };

    let sleep = function(time, abortToken = { abort: function() {} }) {
        return new Promise(function(resolve) {
            setTimeout(resolve, time);
            abortToken.abort = resolve;
        });
    };

    let globalVars = new Map();
    let displayPrintedText = async function(displayedTextValue, retainPrevious=false, noSleep=false) {
        const PAUSE = "<pause>";
        const NEWLINE = "<newline>";
        const BOLD_START = "<bold>";
        const BOLD_END = "</bold>";
        const ITALICS_START = "<italics>";
        const ITALICS_END = "</italics>";
        const VAR_START = "<var>";
        const VAR_END = "</var>";

        let abortToken = { abort: function() {} };

        skipTextDisplay.disabled = false;
        let onClickHandler = function(e) {
            noSleep = true;
            abortToken.abort();
        };
        skipTextDisplay.addEventListener("click", onClickHandler);

        const waitTime = Math.floor(36 - (displayedTextValue.length / 72));

        let summedValue = retainPrevious ? displayedText.innerHTML : "";
        displayedText.innerHTML = summedValue;
        let bolding = 0;
        let italicization = 0;
        let variableBuffer = "";
        let gettingVariable = false;
        for (let i = 0; i < displayedTextValue.length; i ++) {
            if (displayedTextValue.slice(i).startsWith(PAUSE)) {
                // A pause.
                if (!noSleep) await sleep(waitTime * 13, abortToken);
                i += PAUSE.length - 1;
                continue;
            }

            if (displayedTextValue.slice(i).startsWith(NEWLINE)) {
                summedValue += "<br>";
                displayedText.innerHTML = summedValue;
                if (!noSleep) await sleep(waitTime, abortToken);
                i += NEWLINE.length - 1;
                continue;
            }

            if (displayedTextValue.slice(i).startsWith(BOLD_START)) {
                // Start bold text.
                bolding ++;
                i += BOLD_START.length - 1;
                continue;
            }

            if (displayedTextValue.slice(i).startsWith(BOLD_END)) {
                // End bold text.
                if (bolding > 0) {
                    bolding --;
                }
                i += BOLD_END.length - 1;
                continue;
            }

            if (displayedTextValue.slice(i).startsWith(ITALICS_START)) {
                // Start italics text.
                italicization ++;
                i += ITALICS_START.length - 1;
                continue;
            }

            if (displayedTextValue.slice(i).startsWith(ITALICS_END)) {
                // End italics text.
                if (italicization > 0) {
                    italicization --;
                }
                i += ITALICS_END.length - 1;
                continue;
            }

            if (displayedTextValue.slice(i).startsWith(VAR_START)) {
                gettingVariable = true;
                i += VAR_START.length - 1;
                continue;
            }

            if (gettingVariable) {
                if (displayedTextValue.slice(i).startsWith(VAR_END)) {
                    const variableValue = globalVars.get(variableBuffer);
                    if (variableValue === undefined) {
                        skipTextDisplay.disabled = true;
                        skipTextDisplay.removeEventListener("click", onClickHandler);
                        throw new Error("Tried to lookup undefined variable " + variableBuffer + " in text");
                    }

                    // Code duplicated :/
                    let prefix = "";
                    let suffix = "";

                    if (bolding) {
                        prefix += "<strong>";
                        suffix += "</strong>";
                    }

                    if (italicization) {
                        prefix += "<em>";
                        suffix += "</em>";
                    }

                    for (let j = 0; j < variableValue.toString().length; j ++) {
                        summedValue += prefix + variableValue.toString()[j].replaceAll("<", "&lt;").replaceAll(">", "&gt;") + suffix;
                        displayedText.innerHTML = summedValue;
                        if (!noSleep) await sleep(waitTime, abortToken);
                    }
                    gettingVariable = false;
                    i += VAR_END.length - 1;
                    variableBuffer = "";
                    continue;
                }
                variableBuffer += displayedTextValue[i];
                continue;
            }

            let prefix = "";
            let suffix = "";

            if (bolding) {
                prefix += "<strong>";
                suffix += "</strong>";
            }

            if (italicization) {
                prefix += "<em>";
                suffix += "</em>";
            }

            summedValue += prefix + displayedTextValue[i].replaceAll("<", "&lt;").replaceAll(">", "&gt;") + suffix;
            displayedText.innerHTML = summedValue;
            if (!noSleep) await sleep(waitTime, abortToken);
        }

        skipTextDisplay.disabled = true;
        skipTextDisplay.removeEventListener("click", onClickHandler);
    };

    let getScript = async function(script) {
        if (window.loadedScripts.has(script)) {
            return window.loadedScripts.get(script);
        } else {
            const scriptData = await (await fetch("assets/" + script + ".json")).json();
            window.loadedScripts.set(script, scriptData);
            return scriptData;
        }
    };

    let currentSceneIndex = 0;
    let currentScript = null;

    // Returns true if the first two arguments represent a scene in a script coming before or the same as the second two arguments.
    let orderCheck = function(scriptName1, sceneNumber1, scriptName2, sceneNumber2) {
        const scriptNames = ["title", "prologue", "awakening"];
        if (scriptNames.indexOf(scriptName1) === -1 || scriptNames.indexOf(scriptName2) === -1) {
            throw new Error("Invalid script passed to orderCheck()");
        }
        if (scriptNames.indexOf(scriptName1) < scriptNames.indexOf(scriptName2)) {
            return true;
        }
        if (scriptNames.indexOf(scriptName1) > scriptNames.indexOf(scriptName2)) {
            return false;
        }
        return sceneNumber1 <= sceneNumber2;
    };

    let serializedGame = function() {
        const obj = {
            currentScript,
            currentSceneIndex,
            globalVars: Object.fromEntries(globalVars),
        };

        return obj;
    };

    saveGame.onclick = async function(e) {
        const saveObj = serializedGame();
        const saveName = await openTextPopup("Save this game under the save name of:", false, "0.85vw");

        if (window.localStorage.choice7Saves === undefined) {
            window.localStorage.choice7Saves = "{}";
        }

        const deserialized = JSON.parse(window.localStorage.choice7Saves);
        if (deserialized.hasOwnProperty(saveName)) {
            const previousSaveWasEarlier = orderCheck(deserialized[saveName].currentScript, deserialized[saveName].currentSceneIndex, saveObj.currentScript, saveObj.currentSceneIndex);
            if (previousSaveWasEarlier) {
                deserialized[saveName] = saveObj;
            } else {
                const confirmation = await openTextPopup("Your current game is at an earlier in-game position than the save that you are attempting to overwrite. Type \"Yes\" and click the Submit button to proceed. Type anything else to cancel the save.", true, "0.7vw", "12.5vh");
                if (confirmation !== "Yes") {
                    await openTextOnlyPopup("Save cancelled.");
                    return;
                }
            }
        } else {
            deserialized[saveName] = saveObj;
        }

        window.localStorage.choice7Saves = JSON.stringify(deserialized);
        await openTextOnlyPopup("Save successful! Remember your save name:\n\"" + saveName + "\"", "0.75vw");
    };

    let runScript = async function(script, startingSceneIndex) {
        currentScript = script;
        const scriptData = await getScript(script);

        // Preprocess the script data
        let makeRandomIdentifier = function() {
            let result = '';
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            const charactersLength = characters.length;
            let counter = 0;
            while (counter < 20) {
                result += characters.charAt(Math.floor(Math.random() * charactersLength));
                counter += 1;
            }
            return result;
        };

        for (let i in scriptData.scenes) {
            if (!scriptData.scenes[i].hasOwnProperty("name")) {
                scriptData.scenes[i].name = makeRandomIdentifier();
            }
        }

        let findSceneIndexByName = function(name) {
            let result = -1;
            for (let i = 0; i < scriptData.scenes.length; i ++) {
                const scene = scriptData.scenes[i];
                if (scene.name === name) {
                    result = i;
                    break;
                }
            }
            return result;
        };

        let findSceneByName = function(name) {
            return scriptData.scenes[findSceneIndexByName(name)];
        };

        const entryPoint = scriptData.init;
        const entryScene = findSceneByName(entryPoint);

        if (startingSceneIndex === undefined) {
            currentSceneIndex = findSceneIndexByName(entryPoint);
        } else {
            currentSceneIndex = startingSceneIndex;
        }

        let runAction = async function(actions, index, resolveFn) {
            const action = actions[index];

            let getValue = async function(operands, offset) {
                const data = operands.split(" ")[offset];
                const multiSpaceData = operands.split(" ").slice(offset).join(" ");

                if (data === "%input") {
                    const printedText = operands.split(" ").slice(offset + 1).join(" ");
                    return await openTextPopup(printedText, false);
                } else if (data === "%random") {
                    const lowerBound = parseInt(operands.split(" ")[offset + 1]);
                    const upperBound = parseInt(operands.split(" ")[offset + 2]);
                    if (isNaN(lowerBound) || isNaN(upperBound)) {
                        throw new Error("Bad lower or upper bound for RNG");
                    }
                    if (upperBound - lowerBound <= 0) {
                        throw new Error("Lower bound was greater than upper bound for RNG");
                    }

                    return (Math.random() * (upperBound - lowerBound)) + lowerBound;
                } else if (!isNaN(parseInt(data))) {
                    return parseInt(data);
                } else if (data.startsWith("$")) {
                    const val = globalVars.get(data.slice(1));
                    if (val !== undefined) {
                        return val;
                    } else {
                        throw new Error("Tried to access undefined variable " + data);
                    }
                } else if (multiSpaceData.startsWith('"') && multiSpaceData.endsWith('"')) {
                    return multiSpaceData.slice(1).slice(0, -1);
                } else {
                    throw new Error("Invalid value " + operands);
                }
            };

            const op = action.split(" ")[0];
            const operands = action.split(" ").slice(1).join(" ");
            switch(op) {
                case "continue":
                    resolveFn({goto: currentSceneIndex + 1});
                    break;
                case "goto":
                    resolveFn({goto: findSceneIndexByName(operands)});
                    break;
                case "stay":
                    resolveFn({});
                    break;

                case "gotoscript":
                    setDisplayedText("");
                    setChoicesTo([]);

                    const parsedF = parseInt(operands.split(" ")[0]);
                    if (!isNaN(parsedF)) {
                        if (parsedF < 10000) {
                            await sleep(parsedF);
                        } else {
                            throw new Error("Refusing to sleep for more than 10 seconds");
                        }
                    } else {
                        throw new Error("Bad sleep duration \"" + operands.split(" ")[0] + "\"");
                    }

                    await runScript(operands.split(" ")[1]);
                    throw new Error("runScript should never exit!");
                    break;

                case "ifeq":
                    {
                        let lookedAheadElse = null;
                        let lookedAheadEndIf = null;
                        let nestLevel = 1;
                        for (let i = index + 1; i < actions.length; i ++) {
                            const lookedOp = actions[i].split(" ")[0];
                            if (nestLevel === 1) {
                                if (lookedOp === "endif") {
                                    if (lookedAheadEndIf === null) {
                                        lookedAheadEndIf = i;
                                        break;
                                    }
                                } else if (lookedOp === "else") {
                                    if (lookedAheadElse === null) {
                                        lookedAheadElse = i;
                                    }
                                }
                            }

                            if (lookedOp === "ifeq") {
                                nestLevel += 1;
                            } else if (lookedOp === "endif") {
                                if (nestLevel === 0) {
                                    throw new Error("Too many endifs for if-statements");
                                }
                                nestLevel -= 1;
                            }
                        }

                        if (lookedAheadEndIf === null) {
                            throw new Error("Could not find matching endif for if-statement");
                        }

                        const lhs = await getValue(operands, 0);
                        const rhs = await getValue(operands, 1);
                        if (lhs !== rhs) {
                            if (lookedAheadElse !== null) {
                                return lookedAheadElse + 1;
                            } else {
                                return lookedAheadEndIf;
                            }
                        }
                        // If they are equal, proceed with normal execution.
                    }
                    break;

                case "else":
                    {
                        let lookedAheadEndIf = null;
                        let nestLevel = 1;
                        for (let i = index + 1; i < actions.length; i ++) {
                            const lookedOp = actions[i].split(" ")[0];
                            if (nestLevel === 1) {
                                if (lookedOp === "endif") {
                                    if (lookedAheadEndIf === null) {
                                        lookedAheadEndIf = i;
                                        break;
                                    }
                                }
                            }

                            if (lookedOp === "ifeq") {
                                nestLevel += 1;
                            } else if (lookedOp === "endif") {
                                if (nestLevel === 0) {
                                    throw new Error("Too many endifs for if-statements");
                                }
                                nestLevel -= 1;
                            }
                        }

                        if (lookedAheadEndIf === null) {
                            throw new Error("Could not find matching endif for if-statement");
                        }

                        return lookedAheadEndIf;
                    }

                case "endif":
                    // no-op
                    break;

                case "sleep":
                    const parsed = parseInt(operands);
                    if (!isNaN(parsed)) {
                        if (parsed < 10000) {
                            await sleep(parsed);
                        } else {
                            throw new Error("Refusing to sleep for more than 10 seconds");
                        }
                    } else {
                        throw new Error("Bad sleep duration \"" + operands + "\"");
                    }
                    break;

                case "setvar":
                    const variableName = operands.split(" ")[0];
                    const data = await getValue(operands, 1);

                    if (data !== undefined) {
                        globalVars.set(variableName, data);
                    }
                    break;

                case "debug":
                    console.log(operands);
                    break;

                case "loadgame":
                    let saveData = null;
                    const fileName = await openTextPopup("Save name of the save you want to load:", true, "0.85vw");
                    const saves = JSON.parse(window.localStorage.choice7Saves);
                    if (saves.hasOwnProperty(fileName)) {
                        saveData = saves[fileName];
                    } else {
                        await openTextOnlyPopup("Save \"" + fileName + "\" not found.");
                        break;
                    }

                    globalVars = new Map(Object.entries(saveData.globalVars));

                    await runScript(saveData.currentScript, saveData.currentSceneIndex);
                    throw new Error("runScript should never exit!");
                    break;

                default:
                    throw new Error("Unknown op " + op);
            }

            return index + 1;
        };

        let runActions = async function(actions, resolveFn) {
            let realActions = actions;
            if (typeof actions === "string") {
                realActions = [actions];
            }

            realActions = realActions.map((a) => a.trim());

            for (let i = 0; i < realActions.length; ) {
                i = await runAction(realActions, i, resolveFn);
            }
        };

        let runScene = async function(scene) {
            setChoicesTo([]);
            if (!scene.retainPreviousText) {
                setDisplayedText("");
            }

            if (scene.hasOwnProperty("text")) {
                const text = scene.text;

                await displayPrintedText(text, true);
            } else if (scene.hasOwnProperty("randomTexts")) {
                const texts = scene.randomTexts;
                const text = texts[Math.floor(Math.random() * texts.length)];

                await displayPrintedText(text, true);
            } else if (scene.hasOwnProperty("immediateText")) {
                const text = scene.immediateText;

                setDisplayedText(text);
            } else {
                throw new Error("Scene had neither randomTexts, immediateText, or text property");
            }

            await sleep(400);

            if (scene.hasOwnProperty("actions")) {
                let result = await new Promise(function(resolve) {
                    runActions(scene.actions, function(info) {
                        resolve(info);
                    });
                });

                if (result.hasOwnProperty("goto")) {
                    return result;
                }
                if (result.hasOwnProperty("newScene")) {
                }
            }

            const sceneChoices = scene.choices;

            return new Promise(function (resolve) {
                const choices = [];
                for (let i = 0; i < sceneChoices.length; i ++) {
                    const actions = sceneChoices[i].actions;

                    choices.push(sceneChoices[i].text);
                    if (sceneChoices[i].hasOwnProperty("fontSize")) {
                        choices.push(sceneChoices[i].fontSize);
                    } else {
                        choices.push("<default>");
                    }
                    choices.push(function() {
                        runActions(actions, resolve);
                    });
                }

                setChoicesTo(choices);
            });
        };

        while (true) {
            let scene = scriptData.scenes[currentSceneIndex];
            let resultingInfo = await runScene(scene);

            if (resultingInfo.hasOwnProperty("goto")) {
                currentSceneIndex = resultingInfo.goto;
            }

            if (currentSceneIndex === -1 || currentSceneIndex >= scriptData.scenes.length) {
                throw new Error("Went to unknown scene " + currentSceneIndex);
            }
        }
    };

    setDisplayedText("");
    setChoicesTo([]);

    await runScript("title");
    throw new Error("runScript should never exit!");
}

window.addEventListener("resourceLoadComplete", function(e) {
    main();
});
