import { animeMaker } from '#anime';

export default animeMaker({
    command: ['spit', 'escupir'],
    description: 'Escupe a alguien o al suelo',
    soloPhrases: {
        global: ['escupa al suelo', 'escapa saliva', 'lanza un escupitajo', 'escupe con rabia']
    },
    togetherPhrases: {
        global: ['escapa a', 'lanza un escupitajo a', 'escupe en dirección a', 'le escupe a']
    }
});
