const { Telegraf, Markup, session} = require('telegraf');
require('dotenv').config()
const fs = require('fs')
const text = require('./const')
require('path');
const bot = new Telegraf(process.env.BOT_TOKEN)
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
    ctx.reply(`👋 Привет, ${ctx.from.first_name} ! Напиши команду /help чтобы узнать, как работает бот`);
});
bot.use(session());
bot.help((ctx) => ctx.reply(text.help))
const ITEMS_PER_PAGE = 10;
bot.command('list', async (ctx) => {
    const { id } = ctx.from;
    const fileName = `${id}.json`;

    try {
        const fileData = await fs.promises.readFile(fileName, 'utf-8');
        const words = JSON.parse(fileData);

        if (words.length === 0) {
            await ctx.reply('Список слов пуст');
            return;
        }

        ctx.session.currentPage = 1;
        await sendPage(ctx, words);

    } catch (err) {
        console.error(err);
        await ctx.reply('Упс, кажется, что-то пошло не так');
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
            await ctx.reply('Список слов пуст');
            return;
        }

        if (words.length > (ctx.session.currentPage * ITEMS_PER_PAGE)) {
            ctx.session.currentPage++;
        }

        await sendPage(ctx, words);

    } catch (err) {
        console.error(err);
        await ctx.reply('Упс, кажется, что-то пошло не так');
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
            await ctx.reply('Список слов пуст');
            return;
        }

        if (ctx.session.currentPage > 1) {
            ctx.session.currentPage--;
        }

        await sendPage(ctx, words);

    } catch (err) {
        console.error(err);
        await ctx.reply('Упс, кажется, что-то пошло не так');
    }
});
async function sendPage(ctx, words) {
    const startIndex = (ctx.session.currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = ctx.session.currentPage * ITEMS_PER_PAGE;
    const pageWords = words.slice(startIndex, endIndex);

    const message = `Количество добавленных слов: ${words.length}\nСтраница ${ctx.session.currentPage}/${Math.ceil(words.length / ITEMS_PER_PAGE)}:\n${pageWords.map((word) => `${word.word} - ${word.translation}`).join('\n')}`;

    const buttons = [];
    if (words.length > endIndex) {
        buttons.push({ text: 'Следующая страница', callback_data: 'next' });
    }
    if (ctx.session.currentPage > 1) {
        buttons.push({ text: 'Предыдущая страница', callback_data: 'prev' });
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
        await ctx.reply('Список слов успешно очищен')
    } catch (err) {
        console.error(err);
        await ctx.reply('Упс, кажется, что-то пошло не так');
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
                    ctx.reply('Упс, кажется, что-то пошло не так. Попробуйте снова');
                    return;
                }
                ctx.reply('Слово удалено');
            })
        } else {
            await ctx.reply('Такого слова не существует в списке, либо вы неправильно его ввели')
        }
    } catch (err) {
        console.error(err);
        await ctx.reply('Упс, кажется, что-то пошло не так');
    }
})
bot.command('quiz', async (ctx) => {
    await startQuiz(ctx);
});
async function startQuiz(ctx) {
    const { id } = ctx.from;
    const fileName = `${id}.json`;
    try {
        const fileData = await fs.promises.readFile(fileName, 'utf-8');
        let words = JSON.parse(fileData);
        const randomChance = Math.random();
        let randomWord, isGuessTranslation = false
        if(randomChance < 0.3) {
            randomWord = getRandomWord(words);
            await ctx.reply(`Введите перевод слова: ${randomWord.translation}`, {
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
        correctWords.forEach(word => {
            const correctAnswer = isGuessTranslation ? word.word : word.translation;
            buttons.push(Markup.callbackButton(correctAnswer, 'true'));
        });
        shuffleArray(buttons);
        const questionType = isGuessTranslation ? 'слово:' : 'перевод слова:';
        await ctx.reply(`Выберите ${questionType} ${randomWord[isGuessTranslation ? 'translation' : 'word']}`, {
            reply_markup: Markup.inlineKeyboard(buttons, { columns: 2 }),
        });
    } catch (error) {
        console.error(error);
        ctx.reply('Кажется, список слов пуст');
    }
}

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
                    await ctx.reply(`Слово ${word} уже существует в списке`);
                    break;
                }
            }
            if (!wordFound) {
                words.push(data);
                await fs.promises.writeFile(fileName, JSON.stringify(words, null, 2));
                await ctx.reply(`Слово ${word} было добавлено в список`);
            }
        } catch (err) {
            console.error(err);
            await ctx.reply("Упс, кажется, что-то пошло не так")
        }
    } else {
        try {
            const fileData = await fs.promises.readFile(fileName, 'utf-8');
            const words = JSON.parse(fileData);
            const userWord = userMessage.trim().toLowerCase();
            const randomWord = getRandomWord(words);
            let isCorrect = false;

            for (let i = 0; i < words.length; i++) {
                const currentWord = words[i];
                const wordToLower = currentWord.word.trim().toLowerCase();
                const translationToLower = currentWord.translation.trim().toLowerCase();

                if (wordToLower === userWord || translationToLower === userWord) {
                    isCorrect = true;
                    await handleCorrectAnswer(ctx);

                    if (wordToLower === randomWord.word.toLowerCase() || translationToLower === randomWord.translation.toLowerCase()) {
                        currentWord.count++;
                        await fs.promises.writeFile(fileName, JSON.stringify(words, null, 2));
                        break;
                    }
                }
            }

            if (!isCorrect) {
                ctx.reply(`Ой, неправильно! Правильное слово: ${randomWord.word}`);

            }
            setTimeout(async () => {
                await startQuiz(ctx);
            }, 100);
        } catch (err) {
            ctx.error("Упс, кажется, что-то пошло не так");
        }
    }
});

function getRandomWord(words) {
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
        setTimeout(async () => {
            await startQuiz(ctx);
        },500);
    }
}
async function handleCorrectAnswer(ctx) {
    try {
        await ctx.reply(`Правильно!`);
    } catch (err) {
        console.error(err);
    }
}

async function handleIncorrectAnswer(ctx) {
    try {
        ctx.reply('Ой, неправильно!');
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

bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))