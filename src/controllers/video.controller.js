import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.models.js"
import { User } from "../models/user.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { deleteInCloudinary,uploadOnCloudinary } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    const videos = await Video.aggregate([
        {
            $match: {
                $or: [
                    { title: { $regex: query, $options: "i" } },
                    { description: { $regex: query, $options: "i" } }
                ]
            }
        },
        {
            $lookup: { 
                from: "users", 
                localField: "owner", 
                foreignField: "_id",
                as: "createdBy"
            }
        },
        {
            $unwind: "$createdBy"
        },
        {
            $project: {
                thumbnail: 1,
                videoFile: 1,
                title: 1,
                description: 1,
                createdBy: {
                    fullName: 1,
                    username: 1,
                    avatar: 1
                }
            }
        },
        {
            $sort: {
                [sortBy]: sortType === 'asc' ? 1 : -1
            }
        },
        {
            $skip: (page - 1) * limit
        },
        {
            $limit: parseInt(limit)
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { videos },
                "All videos"
            )
        )
})


const publishAVideo = asyncHandler(async (req, res) => {
    try {
        const { title, description } = req.body
       
        if (!title || !description) {
            throw new ApiError(400, "Titile or Description requirted")
        }

        const videoFileLocalPath = req.files?.videoFile[0]?.path

        if (!videoFileLocalPath) {
            throw new ApiError(400, "Video file is required!!")
        }

        const videoFile = await uploadOnCloudinary(videoFileLocalPath)

        if (!videoFile.url) {
            throw new ApiError(400, "Error in uploading video file")
        }

        const thumbnailLocalPath = req.files?.thumbnail[0]?.path

        if (!thumbnailLocalPath) {
            throw new ApiError(400, "thumbnail required!!")
        }

        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

        if (!thumbnail.url) {
            throw new ApiError(400, "Error in thumbnail uploading!!")
        }

        const saved = await Video.create({
            title: title,
            description: description,
            thumbnail: thumbnail?.url,
            videoFile: videoFile?.url,
            duration: videoFile?.duration,
            owner: req.user?._id

        })

        if (!saved) {
            throw new ApiError(400, "Error in publishing video!!")
        }

        return res
            .status(200)
            .json(new ApiResponse(200, { saved }, "Video Uploaded"))


    } catch (error) {
        throw new ApiError(400, error?.message || "Error while uploading video")

    }
})


const getVideoById = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params
        if (!videoId) {
            throw new ApiError(400, "Video Id required to get details")
        }
        //TODO: get video by id

        const video = await Video.findById(videoId)

        if (!video) {
            throw new ApiError(400, "Video not found!!")
        }

        return res
            .status(200)
            .json(new ApiResponse(
                200,
                { video },
                "Video sent")
            )

    } catch (error) {
        throw new ApiError(400, error?.message || "Error while sending video!!")
    }

})


const updateVideo = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params
        
        const { title, description } = req.body

        const video = await Video.findById(videoId)

        if (!((video?.owner).equals(req.user?._id))) {
            throw new ApiError(400, "You cannot Update the details")
        }

        const deleteOldThumbnail = await deleteInCloudinary(video.thumbnail)

        if (deleteOldThumbnail.result !== 'ok') {
            throw new ApiError(400, "old thumbnail not deleted")
        }

        const newThumbnailLocalPath = req.file?.path

        if (!newThumbnailLocalPath) {
            throw new ApiError(400, "thumnail path not found!!")
        }

        const newThumbnail = await uploadOnCloudinary(newThumbnailLocalPath)

        if (!newThumbnail.url) {
            throw new ApiError(400, "Error in uploading thumbnail")
        }

        const videoUpdate = await Video.findByIdAndUpdate(videoId, {
            $set: {
                title: title,
                description: description,
                thumbnail: newThumbnail?.url
            }
        }, {
            new: true
        })

        return res
            .status(200)
            .json(new ApiResponse(200, { videoUpdate }, "Video Details update successfully"))


    } catch (error) {
        throw new ApiError(400, "Error in updating video details")
    }
})


const deleteVideo = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params
        //TODO: delete video

        if (!videoId) {
            throw new ApiError(400, "Please give video Id")
        }

        const video = await Video.findById(videoId)

        if (!((video?.owner).equals(req.user?._id))) {
            throw new ApiError(400, "You cannot Update the details")
        }

        const videoDelete = await deleteInCloudinary(video.videoFile)
        if (videoDelete.result !== 'ok') {
            throw new ApiError(400,"Not able to delete video file")
        }

        const thumdDelete = await deleteInCloudinary(video.thumbnail)
        if (thumdDelete.result !== 'ok') {
            throw new ApiError(400,"Not able to delete thumbnail file")
        }

        const deletedVideo = await Video.findByIdAndDelete(videoId)

        if (!deletedVideo) {
            throw new ApiError(400, "Video not deleted")
        }

        return res
            .status(200)
            .json(new ApiResponse(200, { deletedVideo }, "Video deleted successfully"))

    } catch (error) {
        throw new ApiError(400, error?.message || "Error while deleting video")
    }
})


const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!videoId) {
        throw new ApiError(400, "Video Id is required")
    }
    const video = await Video.findById(videoId)

    if (!((video?.owner).equals(req.user?._id))) {
        throw new ApiError(400, "You cannot Update the details")
    }

    const videoChanged = await Video.findByIdAndUpdate(videoId, {
        $set: {
            isPublished: !video.isPublished
        }
    },
        {
            new: true
        }
    )

    return res
        .status(200)
        .json(new ApiResponse(200, { videoChanged }, "Changed View of the Publication"))


})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}