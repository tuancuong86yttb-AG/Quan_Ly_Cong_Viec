import { GoogleGenAI, Type } from "@google/genai";
import { Priority, Task } from "../types";

// The API key is obtained exclusively from process.env.API_KEY.
// We use a function to create a new instance right before the API call as per guidelines.
const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const suggestTasks = async (topic: string): Promise<Partial<Task>[]> => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Tạo 5 nhiệm vụ sáng tạo, thiết thực và có thể thực hiện được cho chủ đề: "${topic}". 
      Mỗi nhiệm vụ phải có:
      - title: Tiêu đề ngắn gọn, hành động.
      - description: Mô tả chi tiết cách thực hiện.
      - priority: Một trong các giá trị: "Thấp", "Trung bình", "Cao".
      - category: Một trong các danh mục: "Công việc", "Cá nhân", "Mua sắm", "Sức khỏe", "Tài chính".
      
      Yêu cầu: Phản hồi hoàn toàn bằng tiếng Việt, định dạng JSON chuẩn.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              priority: { type: Type.STRING, enum: Object.values(Priority) },
              category: { type: Type.STRING }
            },
            required: ["title", "description", "priority", "category"]
          }
        }
      }
    });

    // Access .text property directly (not a method)
    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Suggestion Error:", error);
    return [];
  }
};

export const decomposeTask = async (taskTitle: string, description: string): Promise<string[]> => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Hãy đóng vai một chuyên gia quản lý dự án. Chia nhỏ nhiệm vụ sau thành 4-6 đầu mục công việc con (subtasks) cụ thể, thực tế và có thể đo lường được:
      Nhiệm vụ: "${taskTitle}"
      Mô tả chi tiết: ${description}
      
      Yêu cầu: Trả về một danh sách các chuỗi ký tự bằng tiếng Việt.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    // Access .text property directly
    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Decomposition Error:", error);
    return [];
  }
};