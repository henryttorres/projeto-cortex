import { useEffect, useRef, useState } from "react";
import "./learning-video.css";

export default function LearningVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    // Interrompe a reprodução quando a cena sai da área de leitura.
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) element.pause();
    });
    const pauseWhenHidden = () => { if (document.hidden) element.pause(); };
    observer.observe(element);
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", pauseWhenHidden); };
  }, []);

  return <section className="learning-video" aria-labelledby="learning-video-title">
    <div className="learning-video__heading">
      <span className="eyebrow">Aprendizagem com tecnologia</span>
      <h3 id="learning-video-title">Tecnologia que orienta. Ensino que acompanha.</h3>
      <p>Nossa proposta: integrar IA ao aprendizado com acompanhamento humano.</p>
    </div>
    <div className="learning-video__stage">
      {failed ? <p className="learning-video__fallback" role="status">Não foi possível carregar o vídeo. A cena ilustrativa apresenta estudante e professora utilizando um notebook.</p> :
        <video ref={video} controls muted playsInline preload="metadata" aria-label="Cena ilustrativa: estudante e professora utilizando um notebook" aria-describedby="learning-video-caption" onError={() => setFailed(true)}>
          <source src="/videos/aprendizagem-com-tecnologia.mp4" type="video/mp4" onError={() => setFailed(true)} />
          Seu navegador não oferece reprodução deste vídeo.
        </video>}
      <aside className="learning-video__example" aria-label="Exemplo de orientação com IA">
        <span className="eyebrow">Exemplo de apoio com IA</span>
        <p><strong>Estudante</strong><span>Por onde começo?</span></p>
        <p><strong>Orientação</strong><span>O que você já sabe sobre esse problema?</span></p>
        <small>Demonstração ilustrativa · IA não conectada</small>
      </aside>
    </div>
    <p id="learning-video-caption" className="learning-video__caption">Cena gerada com IA. Inicie o vídeo para assistir; use os controles para pausar. O diálogo é um exemplo da proposta, não uma transcrição da cena.</p>
  </section>;
}
