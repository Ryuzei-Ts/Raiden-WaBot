import { animeMaker } from '#anime';

export default animeMaker({
    command: ['kill', 'matar'],
    description: 'Elimina a alguien o a ti mismo (en broma)',
    soloPhrases: {
        global: ['se autodestruye', 'se elimina', 'se aniquila', 'se borra del mapa']
    },
    togetherPhrases: {
        global: ['mata a', 'elimina a', 'aniquila a', 'asesina a']
    }
});
