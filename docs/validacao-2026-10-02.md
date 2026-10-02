# Remoção de áudio — 02/10/2026

Atende ao pedido de retirar a fala em inglês. O site agora referencia aprendizagem-com-tecnologia-sem-audio.mp4. Original preservado no mesmo diretório.

FFmpeg executado com -map 0:v:0 -c:v copy -an -movflags +faststart. A inspeção da saída mostrou somente vídeo H.264, 1280 × 720, 24 fps, 8 segundos e nenhum stream de áudio.

Hash SHA256 do stream de vídeo original e final, calculado com streamhash e cópia de codec, idêntico: e537ef50587aa833751f63e4c1bfe83ac0c3b37d52990160c564d36417449c73.

Build TypeScript/Vite aprovado. Layout e comportamento dos controles não foram alterados nem revalidados no navegador nesta rodada. Imagens do storytelling permanecem pendentes; nenhuma geração foi concluída no Higgsfield devido à exigência de plano Basic.