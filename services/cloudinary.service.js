require("../config/cloudinary");
const cloudinary = require("../config/cloudinary");

const uploadBuffer = (buffer, folder, publicId) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folder || "thriftcircle",
        ...(publicId ? { public_id: publicId } : {}),
      },
      (err, result) => {
        if (err) return reject(err);
        resolve({ url: result.secure_url, public_id: result.public_id });
      },
    );
    stream.end(buffer);
  });

const uploadImage = async (buffer, folder = "thriftcircle") => {
  return uploadBuffer(buffer, folder);
};

const uploadMany = async (buffers, folder = "listings") => {
  const out = [];
  for (let i = 0; i < buffers.length; i++) {
    const r = await uploadBuffer(buffers[i], folder);
    out.push(r);
  }
  return out;
};

const deleteImage = async (publicId) => {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId);
};

module.exports = {
  uploadImage,
  uploadMany,
  deleteImage,
};
