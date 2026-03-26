import React from "react";
import { Heart, Spade, Diamond, Club } from "lucide-react";

const ANSWER_STYLES = [
  { bg: "bg-red-500", icon: Heart },
  { bg: "bg-blue-600", icon: Spade },
  { bg: "bg-orange-500", icon: Diamond },
  { bg: "bg-green-500", icon: Club },
];

export default function AnswerOptionsGrid({ options, mode = "display", answerCounts }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {options?.map((opt, idx) => {
        const style = ANSWER_STYLES[idx];
        const IconComponent = style.icon;

        if (mode === "results") {
          const isCorrect = opt.is_correct;
          return (
            <div
              key={idx}
              className={`${style.bg} ${isCorrect ? "ring-4 ring-white" : "opacity-60"} text-white p-6 rounded-lg relative`}
            >
              <IconComponent size={24} className="absolute left-4 top-4" fill="white" />
              <div className="text-xl font-bold mb-2 mt-8">{opt.text}</div>
              <div className="text-lg">
                {answerCounts?.[idx] || 0} answer{answerCounts?.[idx] !== 1 ? "s" : ""}
              </div>
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
            className={`${style.bg} text-white p-8 rounded-lg text-center text-2xl font-bold flex flex-col md:flex-row items-center justify-center gap-3 relative`}
          >
            <IconComponent size={28} className="shrink-0" fill="white" />
            <span className="text-center">{opt.text}</span>
          </div>
        );
      })}
    </div>
  );
}
