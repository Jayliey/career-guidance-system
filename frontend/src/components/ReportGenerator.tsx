import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface CareerMatch {
  name: string;
  score: number;
  description: string;
  matchedSkills: string[];
  missingSkills: string[];
  completion: number;
  reasoning: string;
}

interface UserProfile {
  interest: string;
  skills: { name: string; proficiency: number }[];
  email?: string;
  name?: string;
}

class ReportGenerator {
  static async generateReport(
    userProfile: UserProfile,
    careerMatches: CareerMatch[]
  ) {
    const reportElement = document.createElement("div");
    reportElement.style.position = "absolute";
    reportElement.style.top = "-9999px";
    reportElement.style.left = "-9999px";
    reportElement.style.width = "800px";
    reportElement.style.backgroundColor = "white";
    reportElement.style.color = "#333";
    reportElement.style.fontFamily = "Arial, sans-serif";
    reportElement.style.padding = "40px";
    reportElement.style.borderRadius = "8px";

    reportElement.innerHTML = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #4f8cff; margin-bottom: 10px;">CareerAI Assessment Report</h1>
        <p style="color: #666;">Generated on ${new Date().toLocaleDateString()}</p>
        <hr style="border: 1px solid #eee;">
      </div>

      <div style="margin-bottom: 30px;">
        <h2 style="color: #4f8cff; border-bottom: 2px solid #4f8cff; padding-bottom: 10px;">
          User Profile
        </h2>
        <p><strong>Interest Area:</strong> ${userProfile.interest}</p>
        <p><strong>Email:</strong> ${userProfile.email || "Not provided"}</p>

        <h3>Skills</h3>
        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
          ${(userProfile.skills || [])
            .map(
              (skill) => `
            <span style="background: #e8f0fe; padding: 5px 12px; border-radius: 20px; font-size: 12px;">
              ${skill.name} (★ ${skill.proficiency}/5)
            </span>
          `
            )
            .join("")}
        </div>
      </div>

      <div style="margin-bottom: 30px;">
        <h2 style="color: #4f8cff; border-bottom: 2px solid #4f8cff; padding-bottom: 10px;">
          Top Career Recommendations
        </h2>

        ${careerMatches.slice(0, 3).map((career, index) => `
          <div style="margin-bottom: 25px; padding: 15px;
            background: ${index === 0 ? "#f0f7ff" : "#f9f9f9"};
            border-radius: 10px;
            border-left: 4px solid ${index === 0 ? "#4caf50" : "#4f8cff"};">

            <h3 style="margin: 0 0 10px 0; color: #333;">
              ${index + 1}. ${career.name}
              <span style="float: right;
                background: ${
                  career.score >= 70
                    ? "#4caf50"
                    : career.score >= 40
                    ? "#ff9800"
                    : "#f44336"
                };
                color: white;
                padding: 3px 10px;
                border-radius: 20px;
                font-size: 14px;">
                ${career.score}% Match
              </span>
            </h3>

            <p style="color: #666; margin: 10px 0;">
              ${career.description}
            </p>

            <div style="margin: 10px 0;">
              <div style="background: #e0e0e0; border-radius: 10px; overflow: hidden; height: 8px;">
                <div style="width: ${career.completion}%; height: 100%;
                  background: linear-gradient(90deg, #4f8cff, #8a5cff);">
                </div>
              </div>
              <p style="font-size: 12px; color: #666; margin-top: 5px;">
                Skills completion: ${career.completion}%
              </p>
            </div>

            <p style="background: #f0f7ff; padding: 10px;
              border-radius: 8px; font-size: 13px;">
              <strong>🧠 AI Reasoning:</strong> ${career.reasoning}
            </p>

            <div style="margin-top: 10px;">
              <div style="display: inline-block; margin-right: 20px;">
                <strong>✓ You have:</strong>
                <div style="margin-top: 5px;">
                  ${career.matchedSkills
                    .map(
                      (skill) =>
                        `<span style="background: #e8f5e9; padding: 3px 8px;
                        border-radius: 12px; font-size: 11px; margin-right: 5px;">
                        ${skill}
                      </span>`
                    )
                    .join("")}
                  ${
                    career.matchedSkills.length === 0
                      ? '<span style="color: #999;">None</span>'
                      : ""
                  }
                </div>
              </div>

              <div>
                <strong>✗ Missing:</strong>
                <div style="margin-top: 5px;">
                  ${career.missingSkills
                    .map(
                      (skill) =>
                        `<span style="background: #ffebee; padding: 3px 8px;
                        border-radius: 12px; font-size: 11px; margin-right: 5px;">
                        ${skill}
                      </span>`
                    )
                    .join("")}
                  ${
                    career.missingSkills.length === 0
                      ? '<span style="color: #999;">None - Perfect match!</span>'
                      : ""
                  }
                </div>
              </div>
            </div>

          </div>
        `).join("")}
      </div>

      <div style="margin-bottom: 30px;">
        <h2 style="color: #4f8cff;">Next Steps</h2>
        <ul style="line-height: 1.8;">
          <li>Focus on missing skills</li>
          <li>Take online courses</li>
          <li>Build portfolio projects</li>
          <li>Update your CV regularly</li>
          <li>Network in your field</li>
        </ul>
      </div>
    `;

    document.body.appendChild(reportElement);

    try {
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(
        `CareerAI_Report_${new Date().toISOString().split("T")[0]}.pdf`
      );
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      if (reportElement.parentNode) {
        document.body.removeChild(reportElement);
      }
    }
  }
}

export default ReportGenerator;