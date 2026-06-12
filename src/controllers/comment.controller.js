import mongoose, { isValidObjectId } from "mongoose"
import { Comment } from "../models/comment.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.models.js"

const getVideoComments = asyncHandler(async (req, res) => {
   
       try {
         const { videoId } = req.params
         const { page = 1, limit = 10 } = req.query
         if (!videoId) {
             throw new ApiError(400, "No video found with this ID")
         }
         if (!mongoose.Types.ObjectId.isValid(videoId)) {
             throw new ApiError(400, "Invalid video ID format");
         }
         
         const comments = await Comment.aggregate([ 
             {
                 $match: {
                     video: new mongoose.Types.ObjectId(videoId)
                 }
             },
             {
                 $lookup: {
                     from: "users",
                     foreignField: "_id",
                     localField: "owner",
                     as: "createdBy",
                     pipeline: [
                         {
                             $project: {
                                 username: 1,
                                 fullName: 1,
                                 avatar: 1
                             }
                         }
                     ]
                 }
             },
             {
                 $addFields: {
                     createdBy: {
                         $first: "$createdBy"
                     }
                 }
             },
             {
                 $unwind: "$createdBy"
             },
             {
                 $project: {
                     content: 1,
                     createdBy: 1
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
                     comments,
                     "comments Fetched"
                 )
             )
     
       } catch (error) {
        throw new ApiError(400, error.message || "Error while getting comment of video")
       }

})


const addComment = asyncHandler(async (req, res) => {
    try {
        const { content } = req.body

        if (!content) {
            throw new ApiError(404, "Please Write something in comment")
        }
        const video = await Video.findById(req.params?.videoId)
        if (!video) {
            throw new ApiError(400, "No such video Found")
        }

        const videoComment = await Comment.create({
            content,
            video: video._id,
            owner: req.user?._id
        })

        if (!videoComment) {
            throw new ApiError(400, "Error in commenting the video")
        }

        return res
            .status(200)
            .json(200, videoComment, "comment successfully uploaded")

    } catch (error) {
        throw new ApiError(400, error?.message || "Error in comment")
    }

})


const updateComment = asyncHandler(async (req, res) => {
    try {
        const { content } = req.body

        if (!content) {
            throw new ApiError(400, "Please write comment")
        }
        const comment = await Comment.findById(req.params?.commentId)

        if (!comment) {
            throw new ApiError(400, "comment doesn't exist")
        }

        if (!((comment.owner).equals(req.user?._id))) {
            throw new ApiError(
                400,
                "You are not allowed to change the comment")
        }

        const commentUpdate = await Comment.findByIdAndUpdate(
            comment._id,
            {
                $set: {
                    content,
                }
            },
            { new: true })
        return res
            .status(200)
            .json(new ApiResponse(200, commentUpdate, "comment updated successfully"))
    } catch (error) {
        throw new ApiError(400, error?.message || "Error in updating the comment")
    }
})


const deleteComment = asyncHandler(async (req, res) => {
    try {
        const { commentId } = req.params

        if (!commentId) {
            throw new ApiError(400, "Please give comment Id")
        }

        const comment = await Comment.findById(commentId)

        if (!comment) {
            throw new ApiError(400, "No such comment found")
        }

        if (!((comment.owner).equals(req.user?._id))) {
            throw new ApiError(
                400,
                "You cannot delete this comment"
            )
        }
        const deletedComment = await Comment.findByIdAndDelete(comment._id)
        if (!deletedComment) {
            throw new ApiError(
                400,
                "Error while deleting from database"
            )
        }
        return res
            .status(200)
            .json(new ApiResponse(200, deletedComment, "comment deleted successfully"))
    } catch (error) {
        throw new ApiError(400, error?.message || "Something went wrong in deleting the comment")
    }
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}