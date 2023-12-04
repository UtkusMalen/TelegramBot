const { Telegraf, Markup} = require('telegraf');
require('dotenv').config()
const fs = require('fs')
require('path');
const session = require('telegraf/session');
const localization = {
    en: require('./localization/en.json'),
    ru: require('./localization/ru.json'),
    ua: require('./localization/ua.json'),
};
const bot = new Telegraf(process.env.BOT_TOKEN)
bot.use(session());
bot.start((ctx) => {
    const { id } = ctx.from;
    const fileName = `${id}.json`;
    fs.access(fileName, fs.constants.F_OK, (err) => {
        if (err) {
            fs.writeFile(fileName, JSON.stringify([], null), (err) => {
                if (err) {
                    console.error(err);
                }
            });
        }
    });
    ctx.reply(ctx.from.first_name + sendLocalizedText(ctx, 'welcome'));
});
bot.command('lang', async (ctx) => {
    await ctx.reply('Choose language:', {
        reply_markup: {
            inline_keyboard: [
                [
                    Markup.callbackButton('English', 'en' ),
                    Markup.callbackButton('Русскийㅤ', 'ru'),
                    Markup.callbackButton('Українська', 'ua'),
                ],
            ],
        },
   });
})
bot.action('en', async (ctx) => {
    const { id } = ctx.from;
    const langFileName = `${id}Lang.json`;
    const langData = { language: 'en' };
    fs.access(langFileName, fs.constants.F_OK, (err) => {
        if (err) {
            fs.writeFile(langFileName, JSON.stringify(langData, null), (err) => {
                if (err) {
                    console.error(err);
                }
            });
        } else {
            fs.writeFile(langFileName, JSON.stringify(langData, null), (err) => {
                if (err) {
                    console.error(err);
                }
            });
        }
    })
    await ctx.reply('Language set to English');
})
bot.action('ru' , async (ctx) => {
    const { id } = ctx.from;
    const langFileName = `${id}Lang.json`;
    const langData = { language: 'ru' };
    fs.access(langFileName, fs.constants.F_OK, (err) => {
        if (err) {
            fs.writeFile(langFileName, JSON.stringify(langData, null), (err) => {
                if (err) {
                    console.error(err);
                }
            });
        } else {
            fs.writeFile(langFileName, JSON.stringify(langData, null), (err) => {
                if (err) {
                    console.error(err);
                }
            });
        }
    })
    await ctx.reply('Язык установлен на русский');
})
bot.action('ua', async (ctx) => {
    const { id } = ctx.from;
    const langFileName = `${id}Lang.json`;
    const langData = { language: 'ua' };
    fs.access(langFileName, fs.constants.F_OK, (err) => {
        if (err) {
            fs.writeFile(langFileName, JSON.stringify(langData, null), (err) => {
                if (err) {
                    console.error(err);
                }
            });
        } else {
            fs.writeFile(langFileName, JSON.stringify(langData, null), (err) => {
                if (err) {
                    console.error(err);
                }
            });
        }
    })
    await ctx.reply('Мова встановлена на українську');
})

bot.help((ctx) => {
    ctx.reply(sendLocalizedText(ctx, 'help'));
})

const ITEMS_PER_PAGE = 10;
bot.command('list', async (ctx) => {
    const { id } = ctx.from;
    const fileName = `${id}.json`;

    try {
        const fileData = await fs.promises.readFile(fileName, 'utf-8');
        const words = JSON.parse(fileData);

        if (words.length === 0) {
            await ctx.reply(sendLocalizedText(ctx, 'emptyList'));
            return;
        }

        ctx.session.currentPage = 1;
        await sendPage(ctx, words);

    } catch (err) {
        console.error(err);
        await ctx.reply(sendLocalizedText(ctx, 'error'));
    }
});

bot.action('next', async (ctx) => {
    if (ctx.session.currentPage === undefined) {
        ctx.session.currentPage = 1;
    }

    const { id } = ctx.from;
    const fileName = `${id}.json`;

    try {
        const fileData = await fs.promises.readFile(fileName, 'utf-8');
        const words = JSON.parse(fileData);

        if (words.length === 0) {
            await ctx.reply(sendLocalizedText(ctx, 'emptyList'));
            return;
        }

        if (words.length > (ctx.session.currentPage * ITEMS_PER_PAGE)) {
            ctx.session.currentPage++;
        }

        await sendPage(ctx, words);

    } catch (err) {
        console.error(err);
        await ctx.reply(sendLocalizedText(ctx, 'error'));
    }
});

bot.action('prev', async (ctx) => {
    if (ctx.session.currentPage === undefined) {
        ctx.session.currentPage = 1;
    }

    const { id } = ctx.from;
    const fileName = `${id}.json`;

    try {
        const fileData = await fs.promises.readFile(fileName, 'utf-8');
        const words = JSON.parse(fileData);

        if (words.length === 0) {
            await ctx.reply(sendLocalizedText(ctx, 'emptyList'));
            return;
        }

        if (ctx.session.currentPage > 1) {
            ctx.session.currentPage--;
        }

        await sendPage(ctx, words);

    } catch (err) {
        console.error(err);
        await ctx.reply(sendLocalizedText(ctx, 'error'));
    }
});
async function sendPage(ctx, words) {
    const startIndex = (ctx.session.currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = ctx.session.currentPage * ITEMS_PER_PAGE;
    const pageWords = words.slice(startIndex, endIndex);

    const message = `\n${sendLocalizedText(ctx, 'page')} ${ctx.session.currentPage}/${Math.ceil(words.length / ITEMS_PER_PAGE)}:\n${pageWords.map((word) => `${word.word} - ${word.translation}`).join('\n')}`;

    const buttons = [];
    if (words.length > endIndex) {
        buttons.push({ text: `${sendLocalizedText(ctx, 'next')}`, callback_data: 'next' });
    }
    if (ctx.session.currentPage > 1) {
        buttons.push({ text: `${sendLocalizedText(ctx, 'prev')}`, callback_data: 'prev' });
    }

    await ctx.reply(message, {
        reply_markup: {
            inline_keyboard: [buttons],
        },
    });
}
bot.command('clear' , async (ctx) => {
    const {id} = ctx.from;
    const fileName = `${id}.json`
    const fileData = await fs.promises.readFile(fileName, 'utf-8');
    const words = JSON.parse(fileData);

    try {
        words.splice(0, words.length);
        const updatedData = JSON.stringify(words, null, 2);
        fs.writeFile(fileName, updatedData, (err) => {
            if (err) {
                console.error(err);
            }
        })
        await ctx.reply(sendLocalizedText(ctx, 'clear'));
    } catch (err) {
        console.error(err);
        await ctx.reply(sendLocalizedText(ctx, 'error'));
    }
})
bot.command('delete' , async (ctx) => {
    const {id} = ctx.from;
    const fileName = `${id}.json`
    const fileData = await fs.promises.readFile(fileName, 'utf-8');
    const words = JSON.parse(fileData);
    const userMessage = ctx.message.text.substring(8);
    try {
        const [word, translation] = userMessage.split('-');
        const data = {word: word.trim(), translation: translation.trim(), count: 1};
        let found = false;
        for (i=0; i < words.length; i++ ) {
            if (words[i].word === data.word && words[i].translation === data.translation) {
                words.splice(i, 1);
                found = true;
                break;
            }
        }

        if(found) {
            const updatedData = JSON.stringify(words, null, 2);
            fs.writeFile(fileName, updatedData, (err) => {
                if (err) {
                    console.error(err);
                    ctx.reply(sendLocalizedText(ctx, 'error'));
                    return;
                }
                ctx.reply(sendLocalizedText(ctx, 'wordDeleted'));
            })
        } else {
            await ctx.reply(sendLocalizedText(ctx, 'wordNotExists'));
        }
    } catch (err) {
        console.error(err);
        await ctx.reply(sendLocalizedText(ctx, 'error'));
    }
})

bot.command('quiz', async (ctx) => {
    await startQuiz(ctx);
});
async function startQuiz(ctx) {
    const { id } = ctx.from;
    const fileName = `${id}.json`;
    const totalFileName = `${id}Total.json`;
    try {
        const fileData = await fs.promises.readFile(fileName, 'utf-8');
        let words = JSON.parse(fileData);
        if(words.length === 0) {
            await ctx.reply(sendLocalizedText(ctx, 'emptyList'));
            return;
        }
        let totalData = [];
        if (fs.existsSync(totalFileName)) {
            const totalFileData = await fs.promises.readFile(totalFileName, 'utf-8');
            totalData = JSON.parse(totalFileData);
            if(!Array.isArray(totalData)) {
                totalData = [];
            }
        }
        const currentDate = new Date().toISOString().split('T')[0];
        let foundDate = false;

        for(let i=0; i < totalData.length; i++) {
            if(totalData[i].date === currentDate) {
                totalData[i].totalQuizCount++;
                foundDate = true;
                break;
            }
        }

        if(!foundDate) {
            totalData.push({date: currentDate, totalQuizCount: 1});
        }
        await fs.promises.writeFile(totalFileName, JSON.stringify(totalData, null, 2), 'utf-8');

        const randomChance = Math.random();
        let randomWord, isGuessTranslation = false
        if(randomChance < 0.3) {
            randomWord = getRandomWord(words);
            await ctx.reply(`${sendLocalizedText(ctx, 'writeTranslation')} ${randomWord.translation}`, {
                reply_markup: {force_reply: true}
            });
            return;
        } else if(randomChance < 0.6) {
            isGuessTranslation = false;
            randomWord = getRandomWord(words);
        } else {
            isGuessTranslation = true;
            randomWord = getRandomWord(words);
        }
        const correctWords = words.filter(word => {
            return isGuessTranslation ? word.translation === randomWord.translation : word.word === randomWord.word;
        });

        const correctAnswer = correctWords.map(word => isGuessTranslation ? word.word : word.translation)[0];
        const allOptions = words.map((word) => (isGuessTranslation ? word.word : word.translation));
        const otherOptions = allOptions.filter((option) => {
            const isCorrectGuess = correctWords.some(word => option === (isGuessTranslation ? word.word : word.translation));
            return !isCorrectGuess;
        });
        const shuffledOptions = shuffleArray(otherOptions).slice(0, 3);
        for(let i = 0; i < words.length; i++) {
            if(words[i].word === randomWord.word && words[i].translation === correctAnswer) {
                words[i].count++;
                break;
            }
        }
        await fs.promises.writeFile(fileName, JSON.stringify(words, null, 2));
        const buttons = shuffledOptions.map((option) => {
            const isCorrect = correctWords.some(word => option === (isGuessTranslation ? word.word : word.translation));
            return Markup.callbackButton(option, isCorrect.toString());
        });
        const uniqueAnswers = new Set();
        correctWords.forEach (word => {
            const correctAnswer = isGuessTranslation ? word.word : word.translation;
            uniqueAnswers.add(correctAnswer);
        });
        uniqueAnswers.forEach(answer => {
            buttons.push(Markup.callbackButton(answer, 'true'));
        })
        shuffleArray(buttons);
        const maxButtons = 4;
        const limitedButtons = buttons.slice(0, maxButtons);
        const questionType = isGuessTranslation ? `${sendLocalizedText(ctx, 'word')}` : `${sendLocalizedText(ctx, 'translation')}`;
        await ctx.reply(`${sendLocalizedText(ctx, 'pick')} ${questionType} ${randomWord[isGuessTranslation ? 'translation' : 'word']}`, {
            reply_markup: Markup.inlineKeyboard(limitedButtons, { columns: 2 }),
        });
    } catch (error) {
        console.error(error);
        ctx.reply(sendLocalizedText(ctx, 'emptyList'));
    }
}

bot.command('profile', async (ctx) => {
    const { id } = ctx.from;
    const totalFileName = `${id}Total.json`;
    try {
        const fileName = `${id}.json`;
        const fileData = await fs.promises.readFile(fileName, 'utf-8');
        const words = JSON.parse(fileData);
        const wordsCount = words.length;

        let totalData = [];
        if (fs.existsSync(totalFileName)) {
            const totalFileData = await fs.promises.readFile(totalFileName, 'utf-8');
            totalData = JSON.parse(totalFileData);
            if(!Array.isArray(totalData)) {
                totalData = [];
            }
        }

        const currentDate = new Date().toISOString().split('T')[0];
        let foundDate = false;

        for(let i = 0; i < totalData.length; i++) {
            if(totalData[i].date === currentDate) {
                totalData[i].totalQuizCount = totalData[i].totalQuizCount || 0;
                await fs.promises.writeFile(totalFileName, JSON.stringify(totalData, null, 2), 'utf-8');
                await ctx.reply(`${sendLocalizedText(ctx, 'profile')}\n\n${sendLocalizedText(ctx, 'quizCount')} ${totalData[i].totalQuizCount} ${sendLocalizedText(ctx, 'words')}\n${sendLocalizedText(ctx, 'totalWords')} ${wordsCount}`);
                foundDate = true;
                break;
            }
        }

        if(!foundDate) {
            totalData.push({ date: currentDate, totalQuizCount: 0 });
            await fs.promises.writeFile(totalFileName, JSON.stringify(totalData, null, 2), 'utf-8');
            await ctx.reply(`${sendLocalizedText(ctx, 'profile')}\n\n${sendLocalizedText(ctx, 'quizCount')} 0 ${sendLocalizedText(ctx, 'words')}\n${sendLocalizedText(ctx, 'totalWords')} ${wordsCount}`);
        }
    } catch (error) {
        console.error(error);
        await ctx.reply(sendLocalizedText(ctx, 'error'));
    }
});
bot.on('message', async (ctx) => {
    const {id} = ctx.from;
    const fileName = `${id}.json`;
    const userMessage = ctx.message.text;
    if (userMessage.includes("-")) {
        const [word, translation] = userMessage.split('-');
        const data = {word: word.trim(), translation: translation.trim(), count: 1};

        try {
            const fileData = await fs.promises.readFile(fileName, 'utf-8');
            const words = JSON.parse(fileData);
            let wordFound = false;

            for (let i = 0; i < words.length; i++) {
                if (words[i].word.trim() === word.trim() && words[i].translation.trim() === translation.trim()) {
                    wordFound = true;
                    await ctx.reply(`${word} ${sendLocalizedText(ctx, 'wordExists')}`);
                    break;
                }
            }
            if (!wordFound) {
                words.push(data);
                await fs.promises.writeFile(fileName, JSON.stringify(words, null, 2));
                await ctx.reply(`${word} ${sendLocalizedText(ctx, 'wordAdded')}`);
            }
        } catch (err) {
            console.error(err);
            await ctx.reply(sendLocalizedText(ctx, 'error'))
        }
    } else {
        if(!userMessage.includes('/')) {
            const fileData = await fs.promises.readFile(fileName, 'utf-8');
            const words = JSON.parse(fileData);
            const userWord = userMessage.trim().toLowerCase();
            const randomWord = getRandomWord(words);
            const currentWord = randomWord.word.trim().toLowerCase();
            let isCorrect = false;
            const MAX_LEVENSHTEIN_DISTANCE = 1;

            for (let i = 0; i < words.length; i++) {
                const findWord = words[i];
                const wordToLower = findWord.word.trim().toLowerCase();
                const translationToLower = findWord.translation.trim().toLowerCase();
                const levenshteinWordDistance = levenshteinDistance(wordToLower, userWord);
                const levenshteinTranslationDistance = levenshteinDistance(translationToLower, userWord);

                if (wordToLower === userWord || translationToLower === userWord || levenshteinDistance(wordToLower, userWord) <= MAX_LEVENSHTEIN_DISTANCE || levenshteinDistance(translationToLower, userWord) <= MAX_LEVENSHTEIN_DISTANCE) {
                    if(levenshteinWordDistance === 1 || levenshteinTranslationDistance === 1) {
                        await ctx.reply(`${sendLocalizedText(ctx, 'wordWithError')} ${findWord.word}`);
                        isCorrect = true;
                    } else{
                        isCorrect = true;
                        await handleCorrectAnswer(ctx);
                        currentWord.count++;
                        await fs.promises.writeFile(fileName, JSON.stringify(words, null, 2));
                        break;
                    }
                }
            }
            if (!isCorrect) {
                await ctx.reply(sendLocalizedText(ctx, 'justIncorrect'));
            }
            setTimeout(async () => {
                await startQuiz(ctx);
            }, 100);
        }
    }
});
function getRandomWord(words) {
    if(words.length === 0) {
        return null;
    }
    const randomChance = Math.random();
    if(randomChance < 0.67) {
        return words[Math.floor(Math.random() * words.length)];
    } else {
        words.sort((a, b) => a.count - b.count);
        const minCount = words[0].count;
        const wordsWithMinCount = words.filter((word) => word.count === minCount);
        return wordsWithMinCount[Math.floor(Math.random() * wordsWithMinCount.length)];
    }
}
bot.action('false', async (ctx) => {
    await checkAnswer(ctx, false);
});

bot.action('true', async (ctx) => {
    await checkAnswer(ctx, true);
});

async function checkAnswer(ctx, isCorrect) {
    try {

        if (isCorrect) {
            await handleCorrectAnswer(ctx);
        } else {
            await handleIncorrectAnswer(ctx);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await ctx.answerCbQuery();
        setTimeout(async () => {
            await startQuiz(ctx);
        },500);
    }
}
async function handleCorrectAnswer(ctx) {
    await ctx.reply(sendLocalizedText(ctx, 'correct'));
}

async function handleIncorrectAnswer(ctx) {
    ctx.reply(sendLocalizedText(ctx, 'justIncorrect'));
}

function shuffleArray(array) {
    let currentIndex = array.length;
    let temporaryValue;
    let randomIndex;

    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

function levenshteinDistance(a, b) {
    const distanceMatrix = Array.from(Array(a.length + 1), () =>
        Array(b.length + 1).fill(0)
    );

    for (let i = 0; i <= a.length; i++) {
        distanceMatrix[i][0] = i;
    }

    for (let j = 0; j <= b.length; j++) {
        distanceMatrix[0][j] = j;
    }

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
            distanceMatrix[i][j] = Math.min(
                distanceMatrix[i - 1][j] + 1,
                distanceMatrix[i][j - 1] + 1,
                distanceMatrix[i - 1][j - 1] + indicator
            );
        }
    }

    return distanceMatrix[a.length][b.length];
}
function sendLocalizedText(ctx, key) {
    let currentLanguage = getLanguageFromJSON(ctx) || 'en';
    return localization[currentLanguage][key];
}

function getLanguageFromJSON(ctx) {
    if(!`{id}Lang.json`) {
        return null;
    }
    const id = ctx.from.id;
    const langFileName = `${id}Lang.json`;
    try {
        if (fs.existsSync(langFileName)) {
            const fileData = fs.readFileSync(langFileName, 'utf-8');
            const langObj = JSON.parse(fileData);
            return langObj.language;
        }
    } catch (error) {
        console.error(error);
        return null;
    }
}

bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))