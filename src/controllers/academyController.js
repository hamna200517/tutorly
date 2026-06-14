const Joi = require("joi");
const academyEnrollmentService = require("../services/academyEnrollmentService");
const HttpError = require("../utils/httpError");

const enrollSchema = Joi.object({
  academy_id: Joi.number().integer().positive().required(),
  course_id: Joi.number().integer().positive().required(),
});

exports.listAcademies = async (req, res) => {
  const academies = await academyEnrollmentService.listSubscribedAcademies();
  res.json({
    success: true,
    data: {
      academies,
    },
  });
};

exports.listCourses = async (req, res) => {
  const academyId = Number(req.params.academyId);
  if (!Number.isInteger(academyId) || academyId <= 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid academy id");
  }

  const courses = await academyEnrollmentService.listAcademyCourses(academyId);
  res.json({
    success: true,
    data: {
      academy_id: academyId,
      courses,
    },
  });
};

exports.enrollCourse = async (req, res) => {
  const { error, value } = enrollSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Invalid enrollment payload",
      error.details.map((d) => d.message)
    );
  }

  const data = await academyEnrollmentService.enrollInAcademyCourse({
    studentAccountId: req.user.account_id,
    academyId: value.academy_id,
    courseId: value.course_id,
  });

  res.status(201).json({
    success: true,
    data,
  });
};

exports.getMyEnrollments = async (req, res) => {
  const data = await academyEnrollmentService.getMyEnrollments(req.user.account_id, req.user.role);
  res.json({
    success: true,
    data: {
      enrollments: data,
    },
  });
};

exports.seedCourses = async (req, res) => {
  const data = await academyEnrollmentService.seedDemoCoursesForAcademyAccount(req.user.account_id);
  res.status(201).json({
    success: true,
    data,
  });
};
