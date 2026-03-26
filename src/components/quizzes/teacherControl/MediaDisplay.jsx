import React from "react";
import AutoPlayVideo from "../../common/AutoPlayVideo";

export default function MediaDisplay({ question, className = "max-w-md mx-auto rounded-lg shadow-lg mb-4" }) {
  return (
    <>
      {question.image_url && (
        <img src={question.image_url} alt="Question" className={className} />
      )}
      {question.video_url && (
        <AutoPlayVideo
          src={question.video_url}
          className={className}
          reloadKey={question.id}
        />
      )}
      {question.gif_url && (
        <img src={question.gif_url} alt="GIF" className={className} />
      )}
    </>
  );
}
