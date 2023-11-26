const { Telegraf, Markup } = require('telegraf');
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
            fs.writeFile(fileName, JSON.stringify([], null, 2), (err) => {
                if (err) {
                    console.error(err);
                }
            });
        }
    });
    ctx.reply(`👋 Привет, ${ctx.from.first_name} ! Напиши команду /help чтобы узнать, как работает бот`);
});

bot.help((ctx) => ctx.reply(text.help))

bot.command('list', async (ctx) => {
    const {id} = ctx.from;
    const fileName = `${id}.json`
    const fileData = await fs.promises.readFile(fileName, 'utf-8');
    const words = JSON.parse(fileData);
    try {
        await ctx.reply(`Список слов: \n${words.map((word) => `${word.word} - ${word.translation}`).join('\n')}`);
    } catch (err) {
        console.error(err);
        await ctx.reply('Упс, кажется, что-то пошло не так');
    }
})

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
        ctx.reply('Список слов успешно очищен')
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
let lastWord = null
async function startQuiz(ctx) {
    const { id } = ctx.from;
    const fileName = `${id}.json`;
    try {
        const fileData = await fs.promises.readFile(fileName, 'utf-8');
        const words = JSON.parse(fileData);

        let randomWord = getRandomWord(words);
        while (randomWord.word === lastWord) {
            randomWord = getRandomWord(words);
        }
        lastWord = randomWord.word;
        const translations = Array.from(new Set(words.map((word) => word.translation)));
        const correctTranslation = randomWord.translation;
        const translationsFilter = translations.filter((translation) => translation !== correctTranslation);
        const shuffledTranslations = shuffleArray(translationsFilter);

        const buttons = shuffledTranslations.slice(0, 3).map((translation) => {
            const isCorrect = translation === correctTranslation;

            return Markup.callbackButton(translation, isCorrect.toString());
        });
        buttons.push(Markup.callbackButton(correctTranslation, 'true'));
        shuffleArray(buttons);

        await ctx.reply(`Выберите перевод слова ${randomWord.word}`, {
            reply_markup: Markup.inlineKeyboard(buttons, { columns: 2 }),
        });
    } catch (error) {
        console.error(error);
        ctx.reply('Упс, кажется, что-то пошло не так');
    }
}

function getRandomWord(words) {
    return words[Math.floor(Math.random() * words.length)];
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
            await ctx.answerCbQuery();
            await ctx.reply(`Правильно!`);
        } else {
            await ctx.answerCbQuery();
            await ctx.reply('Ой, кажется, вы выбрали неправильный перевод!');
        }
        await startQuiz(ctx);
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

bot.on('message', async (ctx) => {
    const { id } = ctx.from;
    const fileName = `${id}.json`;
    const userMessage = ctx.message.text;
    if (userMessage.includes("-")) {
        const [word, translation] = userMessage.split('-');
        const data = { word: word.trim(), translation: translation.trim(), count: 1 };

        try {
            const fileData = await fs.promises.readFile(fileName, 'utf-8');
            const words = JSON.parse(fileData);
            let wordFound = false;

            for(let i = 0; i < words.length; i++) {
                if (words[i].word.trim() === word.trim() && words[i].translation.trim() === translation.trim()) {
                    wordFound = true;
                    await ctx.reply(`Слово ${word} уже существует в списке`);
                    break;
                }
            }
            if(!wordFound) {
                words.push(data);
                await fs.promises.writeFile(fileName, JSON.stringify(words, null, 2));
                await ctx.reply(`Слово ${word} было добавлено в список`);
            }
        } catch (err) {
            console.error(err);
            await ctx.reply("Упс, кажется, что-то пошло не так")
        }
    }
});




bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))