const { Telegraf, Markup} = require('telegraf');
require('dotenv').config()
const fs = require('fs')
require('path');
const session = require('telegraf/session');
const text = require('./const.js');
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
    ctx.reply(ctx.from.first_name + ', Hello! To learn more about the bot, type /help');
});

bot.help((ctx) => {
    ctx.reply(text.help);
});

const ITEMS_PER_PAGE = 10;
bot.command('list', async (ctx) => {
    const { id } = ctx.from;
    const fileName = `${id}.json`;

    try {
        const fileData = await fs.promises.readFile(fileName, 'utf-8');
        const words = JSON.parse(fileData);

        if (words.length === 0) {
            await ctx.reply('The list is empty');
            return;
        }

        ctx.session.currentPage = 1;
        await sendPage(ctx, words);

    } catch (err) {
        console.error(err);
        await ctx.reply('Oops, something went wrong...');
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
            await ctx.reply('The list is empty');
            return;
        }

        if (words.length > (ctx.session.currentPage * ITEMS_PER_PAGE)) {
            ctx.session.currentPage++;
        }

        await sendPage(ctx, words);

    } catch (err) {
        console.error(err);
        await ctx.reply('Oops, something went wrong...');
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
            await ctx.reply('The list is empty');
            return;
        }

        if (ctx.session.currentPage > 1) {
            ctx.session.currentPage--;
        }

        await sendPage(ctx, words);

    } catch (err) {
        console.error(err);
        await ctx.reply('Oops, something went wrong...');
    }
});
async function sendPage(ctx, words) {
    const startIndex = (ctx.session.currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = ctx.session.currentPage * ITEMS_PER_PAGE;
    const pageWords = words.slice(startIndex, endIndex);

    const message = `Страница ${ctx.session.currentPage}/${Math.ceil(words.length / ITEMS_PER_PAGE)}:\n${pageWords.map((word) => `${word.word} - ${word.translation}`).join('\n')}`;

    const buttons = [];
    if (words.length > endIndex) {
        buttons.push({ text: `Next page`, callback_data: 'next' });
    }
    if (ctx.session.currentPage > 1) {
        buttons.push({ text: `Previous page`, callback_data: 'prev' });
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
        await ctx.reply('The word list has been successfully cleared');
    } catch (err) {
        console.error(err);
        await ctx.reply('Oops, something went wrong...');
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
                    ctx.reply('Oops, something went wrong');
                    return;
                }
                ctx.reply('The word has been successfully deleted');
            })
        } else {
            await ctx.reply('Such a word does not exist');
        }
    } catch (err) {
        console.error(err);
        await ctx.reply('Oops, something went wrong');
    }
})

bot.command('quiz', async (ctx) => {
    await delayStartQuiz(ctx);
});
async function startQuiz(ctx) {
    const { id } = ctx.from;
    const fileName = `${id}.json`;
    const totalFileName = `${id}Total.json`;
    try {
        const fileData = await fs.promises.readFile(fileName, 'utf-8');
        let words = JSON.parse(fileData);
        if(words.length === 0) {
            await ctx.reply('Список пуст');
            return;
        }

        const wordToGuess = words.filter(word => word.count >=3);
        const wordIfLess = words.filter(word => word.count < 3);

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
        if(randomChance < 0.3 && wordIfLess.length > 0) {
            const randomWord = wordIfLess[Math.floor(Math.random() * wordIfLess.length)];
            const wordLength = randomWord.word.length;
            const maskedWord = randomWord.word[0] + "_".repeat(wordLength - 2) + randomWord.word[wordLength - 1];
            await ctx.reply(`Write correctly: ${maskedWord} - ${randomWord.translation}`, {
                reply_markup: {force_reply: true}
            });
            return;
        } else if (randomChance < 0.3) {
            const randomWord = getRandomWord(words);
            await ctx.reply(`Write translation: ${randomWord.translation}`, {
                reply_markup: {force_reply: true}
            });
        }
        else if(randomChance < 0.6) {
            isGuessTranslation = false;
            randomWord = getRandomWord(words);
        } else {
            isGuessTranslation = true;
            randomWord = getRandomWord(wordToGuess);
        }
        const correctWords = words.filter(word => {
            return isGuessTranslation ? (randomWord && word.translation === randomWord.translation) : (randomWord && word.word === randomWord.word);
        });

        const correctAnswer = correctWords.map(word => isGuessTranslation ? word.word : word.translation)[0];
        const allOptions = words.map((word) => (isGuessTranslation ? word.word : word.translation));
        const otherOptions = allOptions.filter((option) => {
            const isCorrectGuess = correctWords.some(word => option === (isGuessTranslation ? word.word : word.translation));
            return !isCorrectGuess;
        });
        const shuffledOptions = shuffleArray(otherOptions).slice(0, 3);
        for(let i = 0; i < words.length; i++) {
            if(randomWord && words[i] && words[i].word === randomWord.word && words[i].translation === correctAnswer) {
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
        const questionType = isGuessTranslation ? `word` : `translation`;
        await ctx.reply(`Choose ${questionType} ${randomWord[isGuessTranslation ? 'translation' : 'word']}`, {
            reply_markup: Markup.inlineKeyboard(limitedButtons, { columns: 2 }),
        });
        for(let i = 0; i < words.length; i++) {
            if(words[i].word === randomWord.word && words[i].translation === correctAnswer) {
                words[i].count++;
                break;
            }
        }
    } catch (error) {
        console.error(error);
    }
}

bot.command('download', async (ctx) => {
    const { id } = ctx.from;
    const fileName = `${id}.json`;

    try {
        const fileData = await fs.promises.readFile(fileName, 'utf-8');
        const words = JSON.parse(fileData);

        if (words.length === 0) {
            await ctx.reply('Word list is empty');
            return;
        }

        const jsonContent = JSON.stringify(words, null, 2);
        const buffer = Buffer.from(jsonContent, 'utf-8');

        await ctx.replyWithDocument({ source: buffer, filename: `${id}.json` });
    } catch (err) {
        console.error(err);
        await ctx.reply('Упс, что-то пошло не так');
    }
});

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
                await ctx.reply(`Your profile:\n\nThe number of words made through /quiz: ${totalData[i].totalQuizCount}\nTotal count of added words: ${wordsCount}`);
                foundDate = true;
                break;
            }
        }

        if(!foundDate) {
            totalData.push({ date: currentDate, totalQuizCount: 0 });
            await fs.promises.writeFile(totalFileName, JSON.stringify(totalData, null, 2), 'utf-8');
            await ctx.reply(`Your profile:\n\nThe number of words made through /quiz: 0\nTotal count of added words: ${wordsCount}`);
        }
    } catch (error) {
        console.error(error);
        await ctx.reply('Oops, something went wrong');
    }
});


bot.on('document', async (ctx) => {
    const { id } = ctx.from;
    const fileName = `${id}.json`;

    try {
        const document = ctx.message.document;
        if (document && document.file_name && document.file_name.endsWith('.json')) {
            const fileLink = await bot.telegram.getFileLink(document.file_id);
            const response = await fetch(fileLink);
            const arrayBuffer = await response.arrayBuffer();
            const fileContent = JSON.parse(Buffer.from(arrayBuffer).toString());
            if (fs.existsSync(fileName)) {
                fs.unlinkSync(fileName);
            }
            fs.writeFile(fileName, JSON.stringify(fileContent, null, 2), (err) => {
                if (err) {
                    console.error(err);
                    ctx.reply('Oops, something went wrong');
                } else {
                    ctx.reply("File successfully uploaded");
                }
            });
        } else {
            await ctx.reply('you sent a file with an extension other than .JSON');
        }
    } catch (err) {
        console.error(err);
        await ctx.reply('Oops, something went wrong');
    }
});

bot.on('message', async (ctx) => {
    const {id: senderId} = ctx.from;
    const botId = ctx.botInfo.id;
    const { id } = ctx.from;
    const fileName = `${id}.json`;
    const userMessage = ctx.message.text;
    if(senderId !== botId) {
        if (userMessage.includes("-")) {
            const [word, translation] = userMessage.split('-');
            const data = {word: word.trim(), translation: translation.trim(), count: 1};
            try {
                let words = [];
                if (fs.existsSync(fileName)) {
                    const fileData = await fs.promises.readFile(fileName, 'utf-8');
                    words = JSON.parse(fileData);
                }
                let wordFound = false;
                for (let i = 0; i < words.length; i++) {
                    if (
                        words[i].word.trim() === word.trim() &&
                        words[i].translation.trim() === translation.trim()
                    ) {
                        wordFound = true;
                        await ctx.reply(`${word} is already in word list`);
                        break;
                    }
                }
                if (!wordFound) {
                    words.push(data);
                    await fs.promises.writeFile(fileName, JSON.stringify(words, null, 2));
                    await ctx.reply(`Word ${word} was successfully added`);
                }
            } catch (err) {
                console.error(err);
                await ctx.reply('Oops, something went wrong');
            }
        } else {
            if (!userMessage.includes('/')) {
                try {
                    const fileData = await fs.promises.readFile(fileName, 'utf-8');
                    const words = JSON.parse(fileData);
                    const userWord = userMessage.trim().toLowerCase();
                    let isCorrect = false;
                    const MAX_LEVENSHTEIN_DISTANCE = 1;
                    let foundExactMatch = false;
                    for (let i = 0; i < words.length; i++) {
                        const findWord = words[i];
                        const wordToLower = findWord.word.trim().toLowerCase();
                        const translationToLower = findWord.translation.trim().toLowerCase();
                        if (wordToLower === userWord || translationToLower === userWord) {
                            await handleCorrectAnswer(ctx);
                            findWord.count++;
                            await fs.promises.writeFile(fileName, JSON.stringify(words, null, 2));
                            foundExactMatch = true;
                            isCorrect = true;
                            break;
                        }
                    }
                    if (!foundExactMatch) {
                        for (let i = 0; i < words.length; i++) {
                            const findWord = words[i];
                            const wordToLower = findWord.word.trim().toLowerCase();
                            const translationToLower = findWord.translation.trim().toLowerCase();

                            const levenshteinWordDistance = levenshteinDistance(wordToLower, userWord);
                            const levenshteinTranslationDistance = levenshteinDistance(translationToLower, userWord);

                            if (levenshteinWordDistance <= MAX_LEVENSHTEIN_DISTANCE || levenshteinTranslationDistance <= MAX_LEVENSHTEIN_DISTANCE) {
                                if (levenshteinWordDistance === 1 || levenshteinTranslationDistance === 1) {
                                    await ctx.reply(`Correct, but there is a misstake in the word. Correct word: ${findWord.word}`);
                                    isCorrect = true;
                                }
                            }
                        }
                    }
                    if (!isCorrect) {
                        await ctx.reply(`Incorrect, try again`);
                    }
                    setTimeout(async () => {
                        await startQuiz(ctx);
                    }, 30);
                } catch (err) {
                    console.error(err);
                    await ctx.reply('Oops, something went wrong');
                }
            }
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
        await ctx.answerCbQuery();
        await delayStartQuiz(ctx);

    } catch (err) {
        console.error(err);
    }
}
async function handleCorrectAnswer(ctx) {
    try {
        await ctx.reply('Correct!');
    } catch (err) {
        console.error(err);
    }
}

async function handleIncorrectAnswer(ctx) {
    try {
        ctx.reply('Incorrect');
    } catch (err) {
        console.error(err);
    }
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

async function delayStartQuiz(ctx) {
    try {
        setTimeout( () => {
            startQuiz(ctx);
        }, 300);
    } catch (err) {
        console.error(err);
    }
}



bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

//
