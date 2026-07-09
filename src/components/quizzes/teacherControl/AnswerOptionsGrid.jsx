import React from "react";
import { Heart, Spade, Diamond, Club } from "lucide-react";

const ANSWER_STYLES = [
  { bg: "bg-red-500", icon: Heart },
  { bg: "bg-blue-600", icon: Spade },
  { bg: "bg-orange-500", icon: Diamond },
  { bg: "bg-green-500", icon: Club },
];

export default function AnswerOptionsGrid({ options, mode = "display", answerCounts, isSurvey = false }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {options?.map((opt, idx) => {
        if (!opt.text && !opt.image_url) return null;

        const style = ANSWER_STYLES[idx];
        const IconComponent = style.icon;

        if (mode === "results") {
          const isCorrect = !isSurvey && opt.is_correct;
          return (
            <div
              key={idx}
              className={`${style.bg} ${isCorrect ? "ring-4 ring-white" : (isSurvey ? "opacity-100" : "opacity-60")} text-white ${opt.image_url ? "p-2" : "p-6"} rounded-lg relative flex flex-col justify-center items-center`}
            >
              {!opt.image_url && <IconComponent size={24} className="absolute left-4 top-4" fill="white" />}
              {opt.image_url ? (
                <div className="w-full flex flex-col items-center">
                  <img
                    src={opt.image_url}
                    alt={opt.text || `Option ${idx + 1}`}
                    className="max-h-24 md:max-h-36 w-full object-contain rounded"
                  />
                  {opt.text && <div className="text-sm font-bold mt-1 text-center bg-black/30 px-2 py-0.5 rounded">{opt.text}</div>}
                  <div className="text-sm font-bold mt-1 text-center bg-black/40 px-3 py-1 rounded-full">
                    {answerCounts?.[idx] || 0} answer{answerCounts?.[idx] !== 1 ? "s" : ""}
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-xl font-bold mb-2 mt-8">{opt.text}</div>
                  <div className="text-lg">
                    {answerCounts?.[idx] || 0} answer{answerCounts?.[idx] !== 1 ? "s" : ""}
                  </div>
                </>
              )}
              {isCorrect && (
                <div className="absolute top-2 right-2 bg-white text-green-600 rounded-full p-2 font-bold">
                  ✓
                </div>
              )}
            </div>
          );
        }

        // Display mode (active question)
        return (
          <div
            key={idx}
            className={`${style.bg} text-white ${opt.image_url ? "p-2" : "p-8"} rounded-lg text-center text-2xl font-bold flex flex-col items-center justify-center relative`}
          >
            {!opt.image_url && <IconComponent size={28} className="shrink-0" fill="white" />}
            {opt.image_url ? (
              <div className="w-full flex flex-col items-center justify-center">
                <img
                  src={opt.image_url}
                  alt={opt.text || `Option ${idx + 1}`}
                  className="max-h-32 md:max-h-48 w-full object-contain rounded"
                />
                {opt.text && <span className="text-base mt-2 bg-black/30 px-3 py-1 rounded">{opt.text}</span>}
              </div>
            ) : (
              <span className="text-center">{opt.text}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
