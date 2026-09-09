import { animeMaker } from '#anime';

export default animeMaker({
    command: ['love', 'amor'],
    description: 'Declara tu amor a alguien o a ti mismo',
    soloPhrases: {
        hombre: ['siente amor en su corazón', 'late por amor', 'se ama a sí mismo', 'su corazón palpita de amor'],
        mujer: ['siente amor en su corazón', 'late por amor', 'se ama a sí misma', 'su corazón palpita de amor'],
        otro: ['siente amor en su corazón', 'late por amor', 'se ama a sí mismo', 'su corazón palpita de amor'],
        indefinido: ['siente amor en su corazón', 'late por amor', 'se ama a sí mism@', 'su corazón palpita de amor']
    },
    togetherPhrases: {
        hombre: ['ama con todo su corazón a', 'está enamorado de', 'siente amor profundo por', 'su corazón late por'],
        mujer: ['ama con todo su corazón a', 'está enamorada de', 'siente amor profundo por', 'su corazón late por'],
        otro: ['ama con todo su corazón a', 'está enamorado de', 'siente amor profundo por', 'su corazón late por'],
        indefinido: ['ama con todo su corazón a', 'está enamorado de', 'siente amor profundo por', 'su corazón late por']
    }
});
