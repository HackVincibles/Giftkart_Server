/**
 * AI Message Generator Service
 * Generates personalized messages, poems, captions, and stories
 * Now uses Gemini API for real AI generation
 */

const geminiService = require('../geminiService');

class MessageGenerator {
    /**
     * Generate personalized message
     * @param {Object} params - Generation parameters
     * @returns {Promise<Object>} Generated message with metadata
     */
    async generateMessage(params) {
        try {
            // Use Gemini for real AI generation
            return await geminiService.generateMessage({ ...params, messageType: 'message' });
        } catch (error) {
            console.error('Gemini message generation failed, using fallback:', error);
            // Fallback to template-based generation
            return this.fallbackMessage(params);
        }
    }

    /**
     * Generate poem
     * @param {Object} params - Generation parameters
     * @returns {Promise<Object>} Generated poem
     */
    async generatePoem(params) {
        try {
            // Use Gemini for real AI generation
            return await geminiService.generateMessage({ ...params, messageType: 'poem' });
        } catch (error) {
            console.error('Gemini poem generation failed, using fallback:', error);
            // Fallback to template-based generation
            return this.fallbackPoem(params);
        }
    }

    /**
     * Generate caption
     * @param {Object} params - Generation parameters
     * @returns {Promise<Object>} Generated caption
     */
    async generateCaption(params) {
        try {
            // Use Gemini for real AI generation
            return await geminiService.generateMessage({ ...params, messageType: 'caption' });
        } catch (error) {
            console.error('Gemini caption generation failed, using fallback:', error);
            // Fallback to template-based generation
            return this.fallbackCaption(params);
        }
    }

    /**
     * Generate story
     * @param {Object} params - Generation parameters
     * @returns {Promise<Object>} Generated story
     */
    async generateStory(params) {
        try {
            // Use Gemini for real AI generation
            return await geminiService.generateMessage({ ...params, messageType: 'story' });
        } catch (error) {
            console.error('Gemini story generation failed, using fallback:', error);
            // Fallback to template-based generation
            return this.fallbackStory(params);
        }
    }

    /**
     * Fallback message generation
     */
    fallbackMessage(params) {
        const {
            recipientName,
            relationship,
            occasion,
            tone = 'emotional',
            interests = [],
            customPrompt = ''
        } = params;

        const templates = this.getTemplates(tone, occasion);
        const template = templates[Math.floor(Math.random() * templates.length)];

        let message = template
            .replace(/{recipientName}/g, recipientName || 'Friend')
            .replace(/{relationship}/g, relationship || 'friend')
            .replace(/{occasion}/g, occasion || 'special day');

        if (interests.length > 0) {
            const interestText = interests.join(', ');
            message = message.replace(/{interests}/g, interestText);
        } else {
            message = message.replace(/{interests}/g, 'your interests');
        }

        if (customPrompt) {
            message = `${customPrompt}\n\n${message}`;
        }

        return {
            original: customPrompt || `Gift for ${recipientName} on ${occasion}`,
            generated: message,
            tone,
            style: 'message',
            wordCount: message.split(' ').length,
            characterCount: message.length
        };
    }

    /**
     * Fallback poem generation
     */
    fallbackPoem(params) {
        const {
            recipientName,
            relationship,
            occasion,
            tone = 'emotional',
            interests = []
        } = params;

        const templates = this.getPoemTemplates(tone, occasion);
        const template = templates[Math.floor(Math.random() * templates.length)];

        let poem = template
            .replace(/{recipientName}/g, recipientName || 'Friend')
            .replace(/{relationship}/g, relationship || 'friend')
            .replace(/{occasion}/g, occasion || 'special day');

        if (interests.length > 0) {
            const interestText = interests[0];
            poem = poem.replace(/{interest}/g, interestText);
        } else {
            poem = poem.replace(/{interest}/g, 'shared moments');
        }

        return {
            original: `Poem for ${recipientName}`,
            generated: poem,
            tone,
            style: 'poem',
            lineCount: poem.split('\n').length,
            wordCount: poem.split(' ').length
        };
    }

    /**
     * Fallback caption generation
     */
    fallbackCaption(params) {
        const {
            recipientName,
            relationship,
            occasion,
            tone = 'emotional'
        } = params;

        const templates = this.getCaptionTemplates(tone, occasion);
        const template = templates[Math.floor(Math.random() * templates.length)];

        const caption = template
            .replace(/{recipientName}/g, recipientName || 'Friend')
            .replace(/{relationship}/g, relationship || 'friend')
            .replace(/{occasion}/g, occasion || 'special day');

        return {
            original: `Caption for ${recipientName}`,
            generated: caption,
            tone,
            style: 'caption',
            characterCount: caption.length,
            hashtagSuggestions: this.generateHashtags(occasion, tone)
        };
    }

    /**
     * Fallback story generation
     */
    fallbackStory(params) {
        const {
            recipientName,
            relationship,
            occasion,
            tone = 'emotional',
            interests = []
        } = params;

        const templates = this.getStoryTemplates(tone, occasion);
        const template = templates[Math.floor(Math.random() * templates.length)];

        let story = template
            .replace(/{recipientName}/g, recipientName || 'Friend')
            .replace(/{relationship}/g, relationship || 'friend')
            .replace(/{occasion}/g, occasion || 'special day');

        if (interests.length > 0) {
            const interestText = interests.join(' and ');
            story = story.replace(/{interests}/g, interestText);
        } else {
            story = story.replace(/{interests}/g, 'shared experiences');
        }

        return {
            original: `Story for ${recipientName}`,
            generated: story,
            tone,
            style: 'story',
            wordCount: story.split(' ').length,
            paragraphCount: story.split('\n\n').length
        };
    }

    /**
     * Get message templates
     */
    getTemplates(tone, occasion) {
        const templates = {
            emotional: [
                `Dear {recipientName},\n\nOn this special {occasion}, I wanted to take a moment to tell you how much you mean to me. Your presence in my life as my {relationship} has brought so much joy and meaning.\n\nI know how much you love {interests}, and I hope this gift reminds you of those passions.\n\nWith love and gratitude,\n[Your Name]`,
                `To my dear {recipientName},\n\nHappy {occasion}! As your {relationship}, I cherish every moment we share. This gift is a small token of my appreciation for all that you do.\n\nMay this {occasion} bring you as much happiness as you bring to others.\n\nWith love,\n[Your Name]`
            ],
            funny: [
                `Hey {recipientName}!\n\nHappy {occasion}! 🎉\n\nI was going to get you something serious, but then I remembered you're my {relationship} and you deserve something as awesome as you are!\n\nSince you're into {interests}, I hope this makes you smile!\n\nCheers to another year of being amazing!\n[Your Name]`,
                `Happy {occasion}, {recipientName}!\n\nYou know you're my favorite {relationship}, right? (Don't tell the others!)\n\nHere's a gift that's almost as cool as you are... almost! 😄\n\nEnjoy!\n[Your Name]`
            ],
            romantic: [
                `My dearest {recipientName},\n\nOn this {occasion}, my heart is full of love for you. As my {relationship}, you've made every moment more beautiful and every memory more precious.\n\nI cherish the moments we share, especially when we enjoy {interests} together.\n\nThis gift is a symbol of my endless love and devotion.\n\nForever yours,\n[Your Name]`,
                `To my beloved {recipientName},\n\nHappy {occasion}, my love. You are my heart, my soul, my everything.\n\nEvery day with you as my {relationship} is a gift I treasure.\n\nThis gift is but a small expression of my boundless love for you.\n\nForever yours,\n[Your Name]`
            ],
            formal: [
                `Dear {recipientName},\n\nOn the occasion of {occasion}, I wish to express my sincere appreciation for you as my {relationship}.\n\nMay this gift serve as a token of my respect and gratitude.\n\nSincerely,\n[Your Name]`,
                `Respected {recipientName},\n\nGreetings on this {occasion}. It is a privilege to know you as my {relationship}.\n\nPlease accept this gift as a mark of my esteem.\n\nWith regards,\n[Your Name]`
            ]
        };

        return templates[tone] || templates.emotional;
    }

    /**
     * Get poem templates
     */
    getPoemTemplates(tone, occasion) {
        const templates = {
            emotional: [
                `For {recipientName}, my dear {relationship},\nOn this {occasion}, I hold you near,\nYour kindness shines, your heart so true,\nEvery moment spent with you feels new.\n\nLike {interest} that brings you joy,\nYou brighten up my world, oh boy!\nThis gift I give, with love so deep,\nA promise that I'll always keep.`,
                `A {occasion} gift for {recipientName} so dear,\nMy {relationship}, whose love I hold so near,\nThrough ups and downs, through joy and pain,\nOur bond remains, time and again.\n\nThis gift I send with love and care,\nTo show I'm always there, to share,\nThe moments sweet, the memories bright,\nThat make our {occasion} truly light.`
            ],
            funny: [
                `Roses are red, violets are blue,\n{recipientName}, you're awesome, it's true!\n\nAs my {relationship}, you're the best,\nBetter than all the rest (I guess... just kidding!)\n\nYou love {interest}, that's cool,\nSo here's a gift, don't ask what it cost,\nJust know I love you, you silly boss!`,
                `Happy {occasion} to {recipientName}!\nMy {relationship}, my friend, my shining beam!\n\nYou're weird but I love you anyway,\nSo here's a gift to brighten your day!\n\nEnjoy it, laugh, and have some fun,\nYou're the best {relationship} under the sun!`
            ]
        };

        return templates[tone] || templates.emotional;
    }

    /**
     * Get caption templates
     */
    getCaptionTemplates(tone, occasion) {
        const templates = {
            emotional: [
                `To my wonderful {relationship} {recipientName} - this {occasion} gift is a small token of my endless appreciation. You make every day brighter! 💝`,
                `Celebrating {recipientName}, my amazing {relationship}! This {occasion}, I wanted to remind you how special you are. Love you! ✨`
            ],
            funny: [
                `For {recipientName}, the only {relationship} who can handle my craziness! Happy {occasion} - here's something almost as awesome as you! 😄`,
                `{recipientName} + {occasion} + this gift = EPIC! You're the best {relationship} ever! 🎁🎉`
            ],
            romantic: [
                `To my love {recipientName} - every {occasion} with you is magical. This gift is for my heart's keeper. 💕`,
                `Happy {occasion} to my soulmate {recipientName}. You are my everything. Love you forever! ❤️`
            ]
        };

        return templates[tone] || templates.emotional;
    }

    /**
     * Get story templates
     */
    getStoryTemplates(tone, occasion) {
        const templates = {
            emotional: [
                `Once upon a time, there was a remarkable {relationship} named {recipientName}. Every {occasion}, they would bring joy to everyone around them. Their passion for {interests} inspired everyone they met.\n\nThis gift is a chapter in our story - a tale of appreciation, love, and the beautiful bond we share. May it remind you of all the wonderful moments we've created together and the many more to come.\n\nThe End... or is it just the beginning?`,
                `In the grand story of life, {recipientName} stands out as a truly special {relationship}. On this {occasion}, I want to celebrate the role you play in my narrative.\n\nFrom our shared love of {interests} to the countless memories we've made, every page of our story together is written with care and affection.\n\nThis gift represents another beautiful chapter in our ongoing tale of friendship and love.`
            ],
            funny: [
                `So there was this {relationship} named {recipientName}. They were pretty awesome, if I do say so myself. One {occasion}, someone decided to give them a gift because they were just that cool.\n\n{recipientName} loved {interests} and was generally the best {relationship} ever. The end.\n\n(Okay, maybe there's more to the story, but let's just say you're awesome and leave it at that!)`,
                `Legend has it that {recipientName}, the world's greatest {relationship}, once received a gift on {occasion}. The gift was amazing, but not as amazing as {recipientName} themselves.\n\nThis {relationship} could often be found enjoying {interests} and being generally fantastic. And that, my friends, is the true story of why you deserve this gift!`
            ]
        };

        return templates[tone] || templates.emotional;
    }

    /**
     * Generate hashtags for captions
     */
    generateHashtags(occasion, tone) {
        const baseHashtags = ['#gift', '#love', '#special'];
        const occasionHashtags = {
            birthday: ['#birthday', '#happybirthday', '#celebration'],
            anniversary: ['#anniversary', '#love', '#together'],
            wedding: ['#wedding', '#marriage', '#love'],
            diwali: ['#diwali', '#festival', '#lights'],
            christmas: ['#christmas', '#xmas', '#festive'],
            valentine: ['#valentine', '#love', '#romance']
        };

        const toneHashtags = {
            emotional: ['#emotional', '#heartfelt', '#meaningful'],
            funny: ['#funny', '#humor', '#lol'],
            romantic: ['#romantic', '#love', '#couplegoals'],
            formal: ['#respect', '#gratitude', '#appreciation']
        };

        return [
            ...baseHashtags,
            ...(occasionHashtags[occasion] || []),
            ...(toneHashtags[tone] || [])
        ];
    }
}

module.exports = new MessageGenerator();
