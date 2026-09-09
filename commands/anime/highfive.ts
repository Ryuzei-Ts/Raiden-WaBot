import { animeMaker } from '#anime';

export default animeMaker({
    command: ['highfive'],
    description: 'Choca los cinco con alguien o consigo mismo',
    soloPhrases: {
        global: ['choca los cinco', 'se da una palmada', 'celebra solo', 'choca su mano']
    },
    togetherPhrases: {
        global: ['choca los cinco con', 'celebra con', 'da una palmada a', 'choca la mano con']
    }
});
